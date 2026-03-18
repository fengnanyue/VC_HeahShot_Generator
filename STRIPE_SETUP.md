# Stripe setup for Headshot Generator

Pricing: **$1 = 5 credits** (1 credit = 1 headshot generation).

## 1. Stripe account and keys

1. Sign up or log in at [dashboard.stripe.com](https://dashboard.stripe.com).
2. **Developers → API keys**  
   - Copy **Publishable key** (`pk_test_...` or `pk_live_...`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.  
   - Copy **Secret key** (`sk_test_...` or `sk_live_...`) → `STRIPE_SECRET_KEY`.

## 2. Create product and price ($1 one-time)

1. **Product catalog → Products → Add product**.
2. **Name:** e.g. `5 Headshot Credits`.
3. **Pricing:**
   - **One time** (not recurring).
   - **Price:** $1.00 USD (or your currency).
4. Save and open the **Price**.
5. Copy the **Price ID** (starts with `price_...`) → `STRIPE_CREDITS_PRICE_ID`.

## 3. Webhook (so payments add credits)

1. **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL:**
   - Local: use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward:  
     `stripe listen --forward-to localhost:3000/api/webhooks/stripe`  
     Then use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`.
   - Production: `https://your-domain.com/api/webhooks/stripe`.
3. **Events to send:** select `checkout.session.completed`.
4. After creating the endpoint, open it and reveal **Signing secret** → `STRIPE_WEBHOOK_SECRET` (`whsec_...`).

## 4. Environment variables

Add to `.env.local` (and to Vercel / your host):

```env
# Stripe ($1 = 5 credits)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CREDITS_PRICE_ID=price_...
```

For production, also set:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

so the checkout success/cancel URLs point to your live site.

## 5. Database migration (Supabase)

Run the credits migration so `profiles` has `credits_balance`:

- In **Supabase Dashboard → SQL Editor**, run the contents of  
  `supabase/migrations/002_credits.sql`  
  (adds `credits_balance int not null default 0` to `profiles`).

Or, if you use the Supabase CLI: `supabase db push` (or run the migration file manually).

## 6. Testing

- Use **test mode** keys (`pk_test_...`, `sk_test_...`) and test card `4242 4242 4242 4242`.
- Buy credits from **Account** → “Buy 5 credits ($1)” → complete checkout.
- After the webhook runs, your profile’s `credits_balance` increases by 5 and generations deduct 1 credit each.

## Summary

| Step | Where | What you get |
|------|--------|--------------|
| API keys | Stripe Dashboard → Developers → API keys | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` |
| Product + Price | Stripe Dashboard → Products → Add product, one-time $1 | `STRIPE_CREDITS_PRICE_ID` |
| Webhook | Stripe Dashboard → Webhooks → Add endpoint | `STRIPE_WEBHOOK_SECRET` |
| DB | Supabase SQL Editor (run `002_credits.sql`) | `profiles.credits_balance` |
