-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  username text unique,
  avatar_url text,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  stripe_subscription_status text,
  trial_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Generations
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  selfie_url text not null,
  style_slug text not null,
  status text not null default 'pending',
  result_url text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.generations enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can read own generations"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "Users can insert own generations"
  on public.generations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own generations"
  on public.generations for update
  using (auth.uid() = user_id);

-- Storage buckets (private; app uses service role in API to upload/read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('selfies', 'selfies', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('headshots', 'headshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
