-- Independent donation support (PRD Section 08)

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  charity_id uuid not null references public.charities(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'INR',
  source text not null default 'independent' check (source in ('independent', 'subscription')),
  status text not null default 'recorded' check (status in ('recorded', 'failed', 'refunded')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.donations is 'Independent and subscription-linked donation records';

drop trigger if exists trg_donations_updated_at on public.donations;
create trigger trg_donations_updated_at before update on public.donations for each row execute function public.set_updated_at();

create index if not exists idx_donations_user_id on public.donations(user_id);
create index if not exists idx_donations_charity_id on public.donations(charity_id);
create index if not exists idx_donations_created_at on public.donations(created_at desc);

alter table public.donations enable row level security;

create policy "Users read own donations" on public.donations
for select using (user_id = auth.uid() or public.is_admin_user());

create policy "Users create own donations" on public.donations
for insert with check (user_id = auth.uid() or public.is_admin_user());

create policy "Admins manage donations" on public.donations
for all using (public.is_admin_user()) with check (public.is_admin_user());
