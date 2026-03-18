import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const priceId = process.env.STRIPE_CREDITS_PRICE_ID;
    if (!priceId || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id ?? null;
    const stripe = getStripe();

    const upsertCustomerId = async (newCustomerId: string) => {
      customerId = newCustomerId;
      await admin
        .from("profiles")
        .update({
          stripe_customer_id: newCustomerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    };

    const createCustomer = async () => {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      await upsertCustomerId(customer.id);
    };

    if (!customerId) {
      await createCustomer();
    } else {
      // If the stored customer was created in a different Stripe account/mode,
      // Stripe will error with "No such customer". In that case we recreate.
      try {
        await stripe.customers.retrieve(customerId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("No such customer")) {
          await createCustomer();
        } else {
          throw err;
        }
      }
    }

    // Validate the price exists for the current STRIPE_SECRET_KEY
    try {
      await stripe.prices.retrieve(priceId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("No such price")) {
        return NextResponse.json(
          {
            error:
              "Stripe price not found. Your STRIPE_CREDITS_PRICE_ID likely belongs to a different Stripe mode/account than STRIPE_SECRET_KEY (test vs live).",
            code: "STRIPE_PRICE_NOT_FOUND",
          },
          { status: 400 }
        );
      }
      throw err;
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/account?credits=success`,
      cancel_url: `${origin}/account`,
      client_reference_id: user.id,
      metadata: {
        credits: String(5),
        user_id: user.id,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
