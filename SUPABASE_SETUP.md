# Supabase setup for Headshot Generator

Follow these steps to connect your new Supabase account to this project.

---

## 1. Create a project

1. Go to **[supabase.com](https://supabase.com)** and sign in (or create an account).
2. Click **New project**.
3. Choose your **Organization** (or create one).
4. Set:
   - **Name**: e.g. `headshot-generator`
   - **Database password**: choose a strong password and **save it** (you need it for DB access).
   - **Region**: pick one close to you.
5. Click **Create new project** and wait until it’s ready (1–2 minutes).

---

## 2. Run the database migration

1. In the Supabase dashboard, open your project.
2. Go to **SQL Editor** (left sidebar).
3. Click **New query**.
4. Open the file **`supabase/migrations/001_initial_schema.sql`** in this repo and copy its **entire** contents.
5. Paste into the SQL Editor.
6. Click **Run** (or press Cmd/Ctrl + Enter).

You should see “Success. No rows returned.” That creates:

- `profiles` and `generations` tables  
- Row Level Security (RLS) policies  
- `selfies` and `headshots` storage buckets  

---

## 3. Configure Auth URLs

1. In the left sidebar go to **Authentication** → **URL Configuration**.
2. Set:
   - **Site URL**: `http://localhost:3000`  
     (use your real site URL when you deploy later)
   - **Redirect URLs**: add:
     - `http://localhost:3000/**`
     - `http://localhost:3000/api/auth/callback`
3. Click **Save**.

---

## 4. Get your API keys

1. Go to **Settings** (gear icon) → **API**.
2. Under **Project URL**, click **Copy**.
3. Under **Project API keys**:
   - Copy the **anon** **public** key.
   - Copy the **service_role** key (click “Reveal” if needed).  
     ⚠️ Keep the service_role key secret; never expose it in the browser or in public repos.

---

## 5. Add env vars to the project

1. In your project folder, open **`.env.local`** (create it if it doesn’t exist, e.g. by copying `.env.example`).
2. Set these variables (use the values you copied):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<paste Project URL here>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon public key here>
SUPABASE_SERVICE_ROLE_KEY=<paste service_role key here>
```

Example (with fake values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file.

---

## 6. (Optional) Create a test user

1. Go to **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Enter an **Email** and **Password** (e.g. `admin@example.com` / `YourSecurePassword123!`).
4. Turn **off** “Auto Confirm User” if you want to test email confirmation; leave it **on** to sign in immediately.
5. Click **Create user**.

You can use this user to sign in at `http://localhost:3000/login`.

---

## 7. Run the app

1. Restart the dev server so it picks up `.env.local`:

```bash
cd /Users/fengnanyue/VibeCode/HeahshotGenerator
PORT=3000 npm run dev
```

2. Open **http://localhost:3000**.
3. Sign up or sign in with your test user.
4. Go to **Dashboard** and try uploading a selfie and generating a headshot.

---

## Quick check

- **Auth**: Sign in at `/login` with the user you created. If you get to the dashboard, Supabase Auth is wired correctly.
- **Database**: After signing in, check **Table Editor** → `profiles` in Supabase; you should see a row for your user.
- **Storage**: After uploading and generating, check **Storage** → `selfies` and `headshots`; you should see files.

If something fails, double-check that `.env.local` has the correct Project URL and both keys, and that you ran the full migration SQL in step 2.
