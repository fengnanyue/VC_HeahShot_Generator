# AI Headshot Generator MVP

Next.js App Router app with Supabase (auth, DB, storage) and mock AI generation.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the migration:

   - Open `supabase/migrations/001_initial_schema.sql` and run its contents in the Supabase SQL Editor.

3. Create two **Storage** buckets in Supabase Dashboard → Storage:

   - **selfies** – private
   - **headshots** – private

   For both buckets, add a policy so the backend can read/write (e.g. use Service Role from the API). For a quick MVP you can allow authenticated users to upload/read in their folder, or keep buckets private and use only the service role from the API (recommended for this MVP).

4. In **Authentication → URL Configuration**, add:

   - Site URL: `http://localhost:3000` (or your app URL)
   - Redirect URLs: `http://localhost:3000/api/auth/callback`

5. Copy env vars from **Project Settings → API** and **Project Settings → Auth** into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, then:

1. **Dashboard**: upload a selfie → choose style → Generate (mock runs ~3s and returns a placeholder image).
2. **History**: view and download past generations.
3. **Account**: profile and billing placeholder.

## Storage RLS (optional)

If you prefer not to use the service role for uploads from the Next.js API, create storage policies in Supabase so that authenticated users can insert/select in `selfies/{user_id}/*` and `headshots/{user_id}/*`. This MVP uses the service role in API routes to upload and read.

## Switching to a real image API

Replace the mock in `src/app/api/generate/route.ts` with a call to Replicate, Fal.ai, or another provider: fetch the generated image, upload it to the `headshots` bucket, and set `result_url` and `status: 'completed'` on the generation row.
