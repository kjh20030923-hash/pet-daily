create table if not exists public.medication_plans (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  med_name text not null,
  dosage text not null,
  frequency text not null,
  times text[] not null default '{}',
  start_date date not null,
  end_date date not null,
  inventory numeric check (inventory is null or inventory >= 0),
  inventory_warning_threshold numeric check (inventory_warning_threshold is null or inventory_warning_threshold >= 0),
  is_completed boolean not null default false,
  notification_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.medication_logs (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.medication_plans(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  med_name text not null,
  dosage text not null,
  scheduled_at timestamptz not null,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (owner_id, plan_id, scheduled_at)
);

drop trigger if exists medication_plans_set_updated_at on public.medication_plans;
create trigger medication_plans_set_updated_at
before update on public.medication_plans
for each row execute function public.set_updated_at();

alter table public.medication_plans enable row level security;
alter table public.medication_logs enable row level security;

create policy "medication_plans_select_own" on public.medication_plans for select using (owner_id = auth.uid());
create policy "medication_plans_insert_own" on public.medication_plans for insert with check (owner_id = auth.uid());
create policy "medication_plans_update_own" on public.medication_plans for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "medication_plans_delete_own" on public.medication_plans for delete using (owner_id = auth.uid());

create policy "medication_logs_select_own" on public.medication_logs for select using (owner_id = auth.uid());
create policy "medication_logs_insert_own" on public.medication_logs for insert with check (owner_id = auth.uid());
create policy "medication_logs_update_own" on public.medication_logs for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "medication_logs_delete_own" on public.medication_logs for delete using (owner_id = auth.uid());

create index if not exists medication_plans_pet_active_idx
  on public.medication_plans (pet_id, is_completed, end_date);
create index if not exists medication_logs_pet_scheduled_idx
  on public.medication_logs (pet_id, scheduled_at desc);
