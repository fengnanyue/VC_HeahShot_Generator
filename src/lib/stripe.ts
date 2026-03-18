import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, { typescript: true });
  }
  return stripeInstance;
}

/** Price: $1 = 5 credits (one-time payment) */
export const CREDITS_PER_PURCHASE = 5;
export const STRIPE_PRICE_AMOUNT_CENTS = 100;
