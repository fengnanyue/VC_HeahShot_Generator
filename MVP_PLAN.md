# AI Headshot Generator SaaS — MVP Plan

## 1. MVP Product Scope

### In scope (v1)
| Feature | Description |
|--------|-------------|
| **Auth** | Email/password sign up and login via Supabase Auth |
| **Selfie upload** | Single image upload (one selfie per session), stored in Supabase Storage |
| **Style selection** | Pick one headshot style from a fixed list (e.g. Professional, Creative, Casual) |
| **AI generation** | Call third-party API (e.g. Replicate, Fal.ai, or Stability) to generate headshot from selfie + style |
| **Generation history** | List of user’s past generations with thumbnails and status |
| **Download** | Download generated headshot image |
| **Billing** | Stripe subscription with free trial (e.g. 3 free generations), then paywall |

### Out of scope (post-MVP)
- Multiple selfies per generation
- Custom style prompts
- Batch generation
- Team/org accounts
- Webhooks for async generation (MVP can use polling or simple sync flow)

---

## 2. Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Next.js App (App Router)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Pages (React)  │  Server Components  │  API Routes  │  Middleware       │
└────────┬────────┴──────────┬──────────┴──────┬───────┴────────┬─────────┘
         │                   │                  │                │
         ▼                   ▼                  ▼                ▼
┌────────────────┐  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase     │  │   Supabase     │  │   Stripe     │  │  Image API   │
│   Auth         │  │   DB + Storage │  │   Billing    │  │  (Replicate  │
│                │  │                │  │              │  │   / Fal.ai)  │
└────────────────┘  └────────────────┘  └──────────────┘  └──────────────┘
```

- **Next.js 14+** (App Router): SSR, API routes, middleware for auth/protection.
- **Supabase**: Auth (email/password), Postgres (users/generations/subscriptions), Storage (selfies + results).
- **Stripe**: Checkout for subscription, Customer Portal, free trial on price.
- **Third-party image API**: Replicate (e.g. InstantID/PhotoMaker) or Fal.ai — sync or short polling for MVP.

---

## 3. Database Schema (Supabase / Postgres)

### Tables

```sql
-- Extend auth.users via public.profiles (1:1 with auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  stripe_subscription_status text, -- active, trialing, canceled, etc.
  trial_used_at timestamptz,        -- when trial was first used (or null)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One row per generation request
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  selfie_url text not null,           -- Supabase Storage URL (input)
  style_slug text not null,           -- e.g. professional, creative, casual
  status text not null default 'pending', -- pending | processing | completed | failed
  result_url text,                    -- Supabase Storage URL (output), null until completed
  error_message text,                 -- if status = failed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optional: track usage for free trial / limits
create table public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,         -- e.g. start of billing period
  period_end date not null,
  generations_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, period_start)
);
```

### Row Level Security (RLS)

- **profiles**: Users can read/update only their own row (`auth.uid() = id`).
- **generations**: Users can insert their own, read/update only their own.
- **usage**: Same as above if you query by `user_id`; or restrict to service role for backend-only updates.

### Storage buckets (Supabase Storage)

- **selfies**: `selfies/{user_id}/{generation_id}.jpg` — private, signed URLs for upload/read.
- **headshots**: `headshots/{user_id}/{generation_id}.jpg` — private, signed URLs for download.

---

## 4. Folder Structure

```
HeahshotGenerator/
├── .env.local                 # NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, STRIPE_*, IMAGE_API_*
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Landing / marketing
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/                 # Protected
│   │   │   ├── layout.tsx               # Auth check + nav
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx             # Upload + style + generate
│   │   │   ├── history/
│   │   │   │   └── page.tsx             # Generation history
│   │   │   └── account/
│   │   │       └── page.tsx             # Billing / subscription
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── callback/
│   │   │   │       └── route.ts         # Supabase auth callback
│   │   │   ├── upload/
│   │   │   │   └── route.ts             # Presigned upload or proxy
│   │   │   ├── generate/
│   │   │   │   └── route.ts             # Create generation, call image API
│   │   │   ├── generations/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts         # GET one, PATCH status/result
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/
│   │   │   │       └── route.ts         # Stripe subscription events
│   │   │   └── create-checkout/
│   │   │       └── route.ts             # Stripe Checkout session
│   │   │
│   │   └── middleware.ts                # Protect /dashboard/*, set auth
│   │
│   ├── components/
│   │   ├── ui/                          # Buttons, inputs, cards (shadcn-style or minimal)
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignupForm.tsx
│   │   ├── dashboard/
│   │   │   ├── UploadSelfie.tsx
│   │   │   ├── StylePicker.tsx
│   │   │   └── GenerateButton.tsx
│   │   ├── history/
│   │   │   └── GenerationCard.tsx
│   │   └── billing/
│   │       └── UpgradePrompt.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # Browser client
│   │   │   ├── server.ts                # Server client (cookies)
│   │   │   └── middleware.ts            # Middleware client
│   │   ├── stripe.ts                    # Stripe client, helpers
│   │   ├── image-api.ts                 # Replicate / Fal.ai client
│   │   └── constants.ts                 # Style slugs, limits (e.g. trial count)
│   │
│   ├── hooks/
│   │   ├── useUser.ts
│   │   └── useGenerations.ts
│   │
│   └── types/
│       └── database.ts                 # Profile, Generation, Usage types
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # Tables + RLS + storage buckets
│
└── public/
    └── (static assets)
```

---

## 5. API Routes

| Method | Route | Purpose |
|--------|--------|--------|
| GET | `/api/auth/callback` | Supabase OAuth/callback; exchange code, redirect |
| POST | `/api/upload` | Accept multipart or base64; validate file → upload to Supabase Storage `selfies/` → return `selfie_url` |
| POST | `/api/generate` | Body: `{ selfie_url, style_slug }`. Check trial/usage → create `generations` row → call image API → upload result to `headshots/` → update row (result_url, status). Return `generation_id`. |
| GET | `/api/generations` | List current user’s generations (optional: `?limit=20&offset=0`) |
| GET | `/api/generations/[id]` | Get one generation (owner only); return signed download URL if completed |
| PATCH | `/api/generations/[id]` | (Optional) Update status/result_url when using async webhooks from image API |
| POST | `/api/create-checkout` | Create Stripe Checkout session for subscription (with trial); redirect to Stripe |
| POST | `/api/webhooks/stripe` | Stripe webhook: `customer.subscription.*` → update `profiles.stripe_*` and `usage` if needed |

---

## 6. Pages Needed

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, CTA “Get started”, “Log in”. No auth required. |
| `/login` | Login | Email + password form → Supabase sign in → redirect to `/dashboard`. |
| `/signup` | Sign up | Email + password → Supabase sign up → redirect to `/dashboard` (or verify email first if enabled). |
| `/dashboard` | Main flow | Upload selfie → choose style → “Generate” → show result or “Processing…”. Paywall if over trial and no active subscription. |
| `/history` | History | List generations (thumbnail, style, status, date). “Download” for completed. |
| `/account` | Account / Billing | Show plan (trial vs paid), “Manage subscription” (Stripe Customer Portal), logout. |

Optional: `/dashboard/result/[id]` for a dedicated result page; MVP can show result inline on `/dashboard` and in `/history`.

---

## 7. Step-by-Step Build Plan

### Day 1 — Foundation and core flow

**Step 1: Project setup (≈30 min)**  
- Create Next.js app (App Router, TypeScript, Tailwind, ESLint).  
- Add dependencies: `@supabase/supabase-js`, `@stripe/stripe-js`, `stripe`, and one SDK for image API (e.g. `replicate` or `fal-ai`).  
- Configure `.env.local` placeholders for Supabase URL/key, Stripe keys, image API key.

**Step 2: Supabase project (≈30 min)**  
- Create Supabase project.  
- Run migration: `profiles`, `generations`, `usage` tables + RLS.  
- Create Storage buckets `selfies` and `headshots` with RLS (e.g. user can read/write own prefix).  
- Enable Email auth; note redirect URL for `/api/auth/callback`.

**Step 3: Auth (≈1 hr)**  
- Implement Supabase client (browser, server, middleware).  
- Middleware: protect `/(dashboard)/*`, redirect unauthenticated to `/login`.  
- `/login`, `/signup` pages and forms; callback route to exchange code and redirect.  
- On first sign-in, insert or update `profiles` (trigger or from callback route).

**Step 4: Dashboard shell and upload (≈1 hr)**  
- `(dashboard)/layout.tsx`: nav (Dashboard, History, Account), user menu.  
- Upload component: file input → resize/validate (e.g. max 5MB, image only) → call `POST /api/upload` → store `selfie_url` in component state.

**Step 5: Styles and generate API (≈1.5 hr)**  
- Define 3–5 styles in `lib/constants.ts` (slug, label, preview image or icon).  
- Style picker UI on dashboard.  
- `POST /api/generate`: read user from Supabase auth; check trial/usage; create `generations` row; call Replicate/Fal with selfie URL + style; upload output to `headshots/`; update row; return `generation_id`.  
- Dashboard: “Generate” button → call API → show “Processing…” then poll `GET /api/generations/[id]` or refetch list until `status === 'completed'` → show result and download link.

**Step 6: History and download (≈30 min)**  
- `GET /api/generations`: list user’s generations.  
- History page: map to cards; “Download” uses signed URL from `GET /api/generations/[id]` or direct Supabase signed URL.

### Day 2 — Billing and polish

**Step 7: Stripe setup (≈45 min)**  
- Create Stripe product + price (recurring, with 3-day or 7-day free trial).  
- `POST /api/create-checkout`: create or get Stripe Customer (by `stripe_customer_id` in profiles), create Checkout session with trial, return `url` → redirect.  
- “Upgrade” or “Subscribe” button on dashboard (when over trial) → call API → redirect to Stripe.

**Step 8: Stripe webhook (≈45 min)**  
- `POST /api/webhooks/stripe`: verify signature, handle `customer.subscription.created/updated/deleted`; update `profiles.stripe_subscription_id` and `stripe_subscription_status`; create/update `usage` if needed.  
- In `POST /api/generate`, enforce: if no active/trialing subscription and `generations_count` (or count of generations this period) >= trial limit, return 402 and show paywall.

**Step 9: Trial logic (≈30 min)**  
- On first generation, set `profiles.trial_used_at = now()` and allow N free generations (e.g. 3).  
- After N, require subscription; show UpgradePrompt component on dashboard and in history.

**Step 10: Polish (≈1–2 hr)**  
- Landing page copy and basic styling.  
- Error states (upload failed, generation failed, payment failed).  
- Loading states and simple toasts or inline messages.  
- Account page: display subscription status, link to Stripe Customer Portal (optional: create portal session API route).  
- Deploy (Vercel); set env vars; add Stripe webhook URL and Supabase redirect URLs.

---

## Tech Choices Summary

| Concern | Choice |
|--------|--------|
| Image API | Replicate (e.g. “tencentarc/photomaker”) or Fal.ai — both have simple REST/JS APIs and good headshot-style models. |
| Free trial | Implement as “N free generations” then paywall; Stripe trial on subscription for first paid period. |
| File size | Limit selfie to e.g. 5MB; optionally resize client-side before upload to speed up API. |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Image API (example: Replicate)
REPLICATE_API_TOKEN=
# or Fal.ai
FAL_KEY=
```

---

You can use this document as the single source of truth while implementing. Start with Steps 1–3, then 4–6, then 7–10.
