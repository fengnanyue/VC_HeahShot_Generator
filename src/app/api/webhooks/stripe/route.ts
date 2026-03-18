import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const CREDITS_PER_PURCHASE = 5;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.user_id;
      if (!userId) {
        return NextResponse.json(
          { error: "Missing user_id in session" },
          { status: 400 }
        );
      }

      const admin = createAdminClient();
      // Idempotency: Stripe may retry webhook delivery. We only credit once per event_id.
      const { error: eventInsertError } = await admin
        .from("stripe_webhook_events")
        .insert({
          event_id: event.id,
          event_type: event.type,
        });

      if (eventInsertError) {
        // If we've already processed this event, treat as success.
        // Postgres unique violation is 23505. Supabase surfaces it as `code`.
        // If we can't confidently detect, fail closed (return 500) so Stripe retries.
        if ((eventInsertError as any)?.code === "23505") {
          return NextResponse.json({ received: true, deduped: true });
        }
        return NextResponse.json(
          { error: eventInsertError.message },
          { status: 500 }
        );
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("credits_balance")
        .eq("id", userId)
        .single();

      const current = profile?.credits_balance ?? 0;
      await admin
        .from("profiles")
        .update({
          credits_balance: current + CREDITS_PER_PURCHASE,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook failed" },
      { status: 500 }
    );
  }
}
