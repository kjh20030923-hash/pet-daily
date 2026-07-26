create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  birthday date,
  sex text,
  breed text,
  condition_notes text,
  medication_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  type text not null check (type in ('feed', 'walk', 'medicine', 'alert')),
  happened_at timestamptz not null,
  detail text,
  image_url text,
  mood text check (mood in ('happy', 'calm', 'tired', 'playful')),
  is_mood_entry boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  happened_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds > 0),
  severity text not null check (severity in ('轻微', '剧烈')),
  consciousness text not null check (consciousness in ('清醒', '模糊')),
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weight_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  happened_at timestamptz not null,
  value_kg numeric(6, 2) not null check (value_kg > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hospital_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  happened_at timestamptz not null,
  hospital text not null,
  indicators text not null,
  note text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bath_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  happened_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.footprints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  location text not null,
  visited_at timestamptz not null,
  note text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medicine_stocks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  name text not null,
  quantity numeric(8, 2) not null default 0 check (quantity >= 0),
  unit text not null default '粒',
  dose_per_use numeric(8, 2) not null default 1 check (dose_per_use > 0),
  reminder_threshold numeric(8, 2) not null default 7 check (reminder_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists pets_set_updated_at on public.pets;
create trigger pets_set_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

drop trigger if exists activity_records_set_updated_at on public.activity_records;
create trigger activity_records_set_updated_at
before update on public.activity_records
for each row execute function public.set_updated_at();

drop trigger if exists medical_logs_set_updated_at on public.medical_logs;
create trigger medical_logs_set_updated_at
before update on public.medical_logs
for each row execute function public.set_updated_at();

drop trigger if exists weight_records_set_updated_at on public.weight_records;
create trigger weight_records_set_updated_at
before update on public.weight_records
for each row execute function public.set_updated_at();

drop trigger if exists hospital_records_set_updated_at on public.hospital_records;
create trigger hospital_records_set_updated_at
before update on public.hospital_records
for each row execute function public.set_updated_at();

drop trigger if exists footprints_set_updated_at on public.footprints;
create trigger footprints_set_updated_at
before update on public.footprints
for each row execute function public.set_updated_at();

drop trigger if exists drafts_set_updated_at on public.drafts;
create trigger drafts_set_updated_at
before update on public.drafts
for each row execute function public.set_updated_at();

drop trigger if exists medicine_stocks_set_updated_at on public.medicine_stocks;
create trigger medicine_stocks_set_updated_at
before update on public.medicine_stocks
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.activity_records enable row level security;
alter table public.medical_logs enable row level security;
alter table public.weight_records enable row level security;
alter table public.hospital_records enable row level security;
alter table public.bath_records enable row level security;
alter table public.footprints enable row level security;
alter table public.drafts enable row level security;
alter table public.medicine_stocks enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "pets_select_own" on public.pets for select using (owner_id = auth.uid());
create policy "pets_insert_own" on public.pets for insert with check (owner_id = auth.uid());
create policy "pets_update_own" on public.pets for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "pets_delete_own" on public.pets for delete using (owner_id = auth.uid());

create policy "activity_records_select_own" on public.activity_records for select using (owner_id = auth.uid());
create policy "activity_records_insert_own" on public.activity_records for insert with check (owner_id = auth.uid());
create policy "activity_records_update_own" on public.activity_records for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "activity_records_delete_own" on public.activity_records for delete using (owner_id = auth.uid());

create policy "medical_logs_select_own" on public.medical_logs for select using (owner_id = auth.uid());
create policy "medical_logs_insert_own" on public.medical_logs for insert with check (owner_id = auth.uid());
create policy "medical_logs_update_own" on public.medical_logs for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "medical_logs_delete_own" on public.medical_logs for delete using (owner_id = auth.uid());

create policy "weight_records_select_own" on public.weight_records for select using (owner_id = auth.uid());
create policy "weight_records_insert_own" on public.weight_records for insert with check (owner_id = auth.uid());
create policy "weight_records_update_own" on public.weight_records for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "weight_records_delete_own" on public.weight_records for delete using (owner_id = auth.uid());

create policy "hospital_records_select_own" on public.hospital_records for select using (owner_id = auth.uid());
create policy "hospital_records_insert_own" on public.hospital_records for insert with check (owner_id = auth.uid());
create policy "hospital_records_update_own" on public.hospital_records for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "hospital_records_delete_own" on public.hospital_records for delete using (owner_id = auth.uid());

create policy "bath_records_select_own" on public.bath_records for select using (owner_id = auth.uid());
create policy "bath_records_insert_own" on public.bath_records for insert with check (owner_id = auth.uid());
create policy "bath_records_delete_own" on public.bath_records for delete using (owner_id = auth.uid());

create policy "footprints_select_own" on public.footprints for select using (owner_id = auth.uid());
create policy "footprints_insert_own" on public.footprints for insert with check (owner_id = auth.uid());
create policy "footprints_update_own" on public.footprints for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "footprints_delete_own" on public.footprints for delete using (owner_id = auth.uid());

create policy "drafts_select_own" on public.drafts for select using (owner_id = auth.uid());
create policy "drafts_insert_own" on public.drafts for insert with check (owner_id = auth.uid());
create policy "drafts_update_own" on public.drafts for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "drafts_delete_own" on public.drafts for delete using (owner_id = auth.uid());

create policy "medicine_stocks_select_own" on public.medicine_stocks for select using (owner_id = auth.uid());
create policy "medicine_stocks_insert_own" on public.medicine_stocks for insert with check (owner_id = auth.uid());
create policy "medicine_stocks_update_own" on public.medicine_stocks for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "medicine_stocks_delete_own" on public.medicine_stocks for delete using (owner_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('pet-images', 'pet-images', false)
on conflict (id) do nothing;

create policy "pet_images_select_own"
on storage.objects for select
using (
  bucket_id = 'pet-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "pet_images_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'pet-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "pet_images_update_own"
on storage.objects for update
using (
  bucket_id = 'pet-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'pet-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "pet_images_delete_own"
on storage.objects for delete
using (
  bucket_id = 'pet-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists activity_records_pet_time_idx on public.activity_records(pet_id, happened_at desc);
create index if not exists medical_logs_pet_time_idx on public.medical_logs(pet_id, happened_at desc);
create index if not exists weight_records_pet_time_idx on public.weight_records(pet_id, happened_at desc);
create index if not exists hospital_records_pet_time_idx on public.hospital_records(pet_id, happened_at desc);
create index if not exists bath_records_pet_time_idx on public.bath_records(pet_id, happened_at desc);
create index if not exists footprints_pet_time_idx on public.footprints(pet_id, visited_at desc);
create index if not exists drafts_owner_time_idx on public.drafts(owner_id, created_at desc);
create index if not exists medicine_stocks_pet_id_idx on public.medicine_stocks(pet_id);
