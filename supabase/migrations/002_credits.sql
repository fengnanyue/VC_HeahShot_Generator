-- Credits balance for pay-per-use ($1 = 5 credits, 1 generation = 1 credit)
alter table public.profiles
  add column if not exists credits_balance int not null default 0;

comment on column public.profiles.credits_balance is 'Remaining headshot generations; 1 generation = 1 credit.';
