-- Golf Charity Subscription Platform schema
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- USERS (extends auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  password_hash text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.users is 'App profile table mapped to Supabase auth.users';

-- SUBSCRIPTIONS
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text,
  plan_type text not null check (plan_type in ('monthly', 'yearly')),
  status text not null check (status in ('active', 'inactive', 'cancelled', 'past_due', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.subscriptions is 'User subscription records synced with Stripe';

-- SCORES
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  score integer not null check (score between 1 and 45),
  played_at timestamptz not null,
  created_at timestamptz not null default now()
);
comment on table public.scores is 'Stores up to latest 5 golf scores per user';

-- CHARITIES
create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text not null,
  image_url text,
  website_url text,
  email text,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.charities is 'Supported charities for subscriber contributions';

-- USER CHARITIES
create table if not exists public.user_charities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  charity_id uuid not null references public.charities(id) on delete restrict,
  contribution_percentage integer not null check (contribution_percentage between 10 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, charity_id)
);
comment on table public.user_charities is 'User-to-charity contribution preferences';

-- DRAWS
create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  draw_number integer unique not null,
  draw_date timestamptz not null default now(),
  winning_numbers integer[] not null,
  draw_logic text not null check (draw_logic in ('random', 'algorithmic')),
  status text not null check (status in ('pending', 'published', 'rolled_over')),
  jackpot_amount numeric(10,2) not null default 0,
  rollover_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(winning_numbers, 1) = 5)
);
comment on table public.draws is 'Monthly draw records and winning number sets';

-- WINNERS
create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  draw_id uuid not null references public.draws(id) on delete cascade,
  match_type integer not null check (match_type in (3,4,5)),
  prize_amount numeric(10,2) not null default 0,
  verification_status text not null check (verification_status in ('pending', 'approved', 'rejected')) default 'pending',
  proof_url text,
  payout_status text not null check (payout_status in ('pending', 'paid')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.winners is 'Draw winners and payout verification workflow';

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

drop trigger if exists trg_charities_updated_at on public.charities;
create trigger trg_charities_updated_at before update on public.charities for each row execute function public.set_updated_at();

drop trigger if exists trg_user_charities_updated_at on public.user_charities;
create trigger trg_user_charities_updated_at before update on public.user_charities for each row execute function public.set_updated_at();

drop trigger if exists trg_draws_updated_at on public.draws;
create trigger trg_draws_updated_at before update on public.draws for each row execute function public.set_updated_at();

drop trigger if exists trg_winners_updated_at on public.winners;
create trigger trg_winners_updated_at before update on public.winners for each row execute function public.set_updated_at();

-- Keep latest 5 scores per user trigger
create or replace function public.enforce_score_limit()
returns trigger
language plpgsql
as $$
begin
  delete from public.scores
  where id in (
    select id
    from public.scores
    where user_id = new.user_id
    order by played_at desc, created_at desc
    offset 5
  );
  return new;
end;
$$;

drop trigger if exists trg_enforce_score_limit on public.scores;
create trigger trg_enforce_score_limit
after insert on public.scores
for each row
execute function public.enforce_score_limit();

-- INDEXES
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create unique index if not exists idx_subscriptions_customer_unique on public.subscriptions(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists idx_subscriptions_subscription_unique on public.subscriptions(stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists idx_scores_user_id on public.scores(user_id);
create index if not exists idx_winners_user_id on public.winners(user_id);
create index if not exists idx_user_charities_user_id on public.user_charities(user_id);
create index if not exists idx_user_charities_charity_id on public.user_charities(charity_id);
create index if not exists idx_draws_created_at on public.draws(created_at desc);
create index if not exists idx_winners_created_at on public.winners(created_at desc);

-- VIEWS
create or replace view public.user_latest_scores as
select s.*
from (
  select s.*, row_number() over (partition by s.user_id order by s.played_at desc, s.created_at desc) as rn
  from public.scores s
) s
where s.rn <= 5;

create or replace view public.user_subscription_status as
select distinct on (s.user_id)
  s.user_id,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.updated_at
from public.subscriptions s
order by s.user_id, s.created_at desc;

create or replace view public.monthly_statistics as
select
  date_trunc('month', now())::date as month,
  (select count(*) from public.users) as total_users,
  (select coalesce(sum(case when status = 'active' and plan_type = 'monthly' then 9.99 when status = 'active' and plan_type = 'yearly' then 89.99/12 else 0 end), 0) from public.subscriptions) as estimated_monthly_revenue,
  (select count(*) from public.charities) as total_charities;

-- RLS
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.scores enable row level security;
alter table public.charities enable row level security;
alter table public.user_charities enable row level security;
alter table public.draws enable row level security;
alter table public.winners enable row level security;

-- helper admin check
create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users u where u.id = auth.uid() and u.is_admin = true
  );
$$;

-- users policies
create policy "Users can read own profile" on public.users
for select using (id = auth.uid() or public.is_admin_user());

create policy "Users can update own profile" on public.users
for update using (id = auth.uid() or public.is_admin_user())
with check (id = auth.uid() or public.is_admin_user());

-- subscriptions policies
create policy "Users can read own subscriptions" on public.subscriptions
for select using (user_id = auth.uid() or public.is_admin_user());

create policy "Admins manage subscriptions" on public.subscriptions
for all using (public.is_admin_user()) with check (public.is_admin_user());

-- scores policies
create policy "Users manage own scores" on public.scores
for all using (user_id = auth.uid() or public.is_admin_user())
with check (user_id = auth.uid() or public.is_admin_user());

-- charities policies
create policy "Public can read charities" on public.charities
for select using (true);

create policy "Admins manage charities" on public.charities
for all using (public.is_admin_user()) with check (public.is_admin_user());

-- user_charities policies
create policy "Users manage own charity links" on public.user_charities
for all using (user_id = auth.uid() or public.is_admin_user())
with check (user_id = auth.uid() or public.is_admin_user());

-- draws policies
create policy "Public can read published draws" on public.draws
for select using (status = 'published' or public.is_admin_user());

create policy "Admins manage draws" on public.draws
for all using (public.is_admin_user()) with check (public.is_admin_user());

-- winners policies
create policy "Users can read own winners" on public.winners
for select using (user_id = auth.uid() or public.is_admin_user());

create policy "Admins manage winners" on public.winners
for all using (public.is_admin_user()) with check (public.is_admin_user());

