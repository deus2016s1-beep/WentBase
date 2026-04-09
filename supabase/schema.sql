-- WentBase / WindBase Supabase schema (MVP)
-- PostgreSQL + Supabase Auth + RLS

create extension if not exists pgcrypto;

-- 1) profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Профили пользователей с ролью доступа (admin/viewer)';

-- Optional: auto-create profile on signup with viewer role by default.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'User'), 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  status text not null default 'active' check (status in ('active', 'on_hold', 'completed')),
  contract_amount numeric(14,2) not null default 0,
  start_date date,
  end_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 3) project_estimates
create table if not exists public.project_estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_no integer not null default 1,
  title text not null,
  amount numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, version_no)
);

-- 4) client_payments
create table if not exists public.client_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  payment_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text,
  comment text,
  created_at timestamptz not null default now()
);

-- 5) project_expenses
create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  expense_date date not null,
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  comment text,
  created_at timestamptz not null default now()
);

-- 6) cash_journal
-- Универсальный журнал движения денег.
-- entry_type:
--   client_payment      (входящие от клиента)
--   project_expense     (исходящие расходы)
--   owner_withdrawal    (вывод доли владельцем)
create table if not exists public.cash_journal (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  entry_date date not null,
  entry_type text not null check (entry_type in ('client_payment', 'project_expense', 'owner_withdrawal')),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(14,2) not null check (amount > 0),
  owner text check (owner in ('kamal', 'ruslan')),
  source_table text check (source_table in ('client_payments', 'project_expenses', 'manual')),
  source_id uuid,
  comment text,
  created_at timestamptz not null default now()
);

-- Recommended indexes
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_project_estimates_project_id on public.project_estimates(project_id);
create index if not exists idx_client_payments_project_id on public.client_payments(project_id);
create index if not exists idx_project_expenses_project_id on public.project_expenses(project_id);
create index if not exists idx_cash_journal_project_id on public.cash_journal(project_id);
create index if not exists idx_cash_journal_entry_date on public.cash_journal(entry_date);

-- Helper function to get current role from profiles.
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_estimates enable row level security;
alter table public.client_payments enable row level security;
alter table public.project_expenses enable row level security;
alter table public.cash_journal enable row level security;

-- Drop old policies if re-run
-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;

-- projects
drop policy if exists "projects_select_admin_viewer" on public.projects;
drop policy if exists "projects_insert_admin" on public.projects;
drop policy if exists "projects_update_admin" on public.projects;
drop policy if exists "projects_delete_admin" on public.projects;

-- project_estimates
drop policy if exists "project_estimates_select_admin_viewer" on public.project_estimates;
drop policy if exists "project_estimates_insert_admin" on public.project_estimates;
drop policy if exists "project_estimates_update_admin" on public.project_estimates;
drop policy if exists "project_estimates_delete_admin" on public.project_estimates;

-- client_payments
drop policy if exists "client_payments_select_admin_viewer" on public.client_payments;
drop policy if exists "client_payments_insert_admin" on public.client_payments;
drop policy if exists "client_payments_update_admin" on public.client_payments;
drop policy if exists "client_payments_delete_admin" on public.client_payments;

-- project_expenses
drop policy if exists "project_expenses_select_admin_viewer" on public.project_expenses;
drop policy if exists "project_expenses_insert_admin" on public.project_expenses;
drop policy if exists "project_expenses_update_admin" on public.project_expenses;
drop policy if exists "project_expenses_delete_admin" on public.project_expenses;

-- cash_journal
drop policy if exists "cash_journal_select_admin_viewer" on public.cash_journal;
drop policy if exists "cash_journal_insert_admin" on public.cash_journal;
drop policy if exists "cash_journal_update_admin" on public.cash_journal;
drop policy if exists "cash_journal_delete_admin" on public.cash_journal;

-- Profiles policies:
-- admin can read all; viewer can read only own profile.
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  using (auth.uid() = id or public.current_user_role() = 'admin');

create policy "profiles_admin_update"
  on public.profiles
  for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Shared read policy (admin + viewer) for business tables.
create policy "projects_select_admin_viewer"
  on public.projects
  for select
  using (public.current_user_role() in ('admin', 'viewer'));

create policy "project_estimates_select_admin_viewer"
  on public.project_estimates
  for select
  using (public.current_user_role() in ('admin', 'viewer'));

create policy "client_payments_select_admin_viewer"
  on public.client_payments
  for select
  using (public.current_user_role() in ('admin', 'viewer'));

create policy "project_expenses_select_admin_viewer"
  on public.project_expenses
  for select
  using (public.current_user_role() in ('admin', 'viewer'));

create policy "cash_journal_select_admin_viewer"
  on public.cash_journal
  for select
  using (public.current_user_role() in ('admin', 'viewer'));

-- Admin write policies.
create policy "projects_insert_admin"
  on public.projects
  for insert
  with check (public.current_user_role() = 'admin');

create policy "projects_update_admin"
  on public.projects
  for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "projects_delete_admin"
  on public.projects
  for delete
  using (public.current_user_role() = 'admin');

create policy "project_estimates_insert_admin"
  on public.project_estimates
  for insert
  with check (public.current_user_role() = 'admin');

create policy "project_estimates_update_admin"
  on public.project_estimates
  for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "project_estimates_delete_admin"
  on public.project_estimates
  for delete
  using (public.current_user_role() = 'admin');

create policy "client_payments_insert_admin"
  on public.client_payments
  for insert
  with check (public.current_user_role() = 'admin');

create policy "client_payments_update_admin"
  on public.client_payments
  for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "client_payments_delete_admin"
  on public.client_payments
  for delete
  using (public.current_user_role() = 'admin');

create policy "project_expenses_insert_admin"
  on public.project_expenses
  for insert
  with check (public.current_user_role() = 'admin');

create policy "project_expenses_update_admin"
  on public.project_expenses
  for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "project_expenses_delete_admin"
  on public.project_expenses
  for delete
  using (public.current_user_role() = 'admin');

create policy "cash_journal_insert_admin"
  on public.cash_journal
  for insert
  with check (public.current_user_role() = 'admin');

create policy "cash_journal_update_admin"
  on public.cash_journal
  for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "cash_journal_delete_admin"
  on public.cash_journal
  for delete
  using (public.current_user_role() = 'admin');
