alter table public.pets
  add column if not exists kind text not null default 'dog'
    check (kind in ('dog', 'cat', 'other')),
  add column if not exists has_epilepsy boolean not null default false;

create table if not exists public.expense_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  happened_at timestamptz not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null check (category in ('主粮', '零食', '医疗', '洗护', '用品', '其他', '饮食', '美容')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists expense_records_set_updated_at on public.expense_records;
create trigger expense_records_set_updated_at
before update on public.expense_records
for each row execute function public.set_updated_at();

alter table public.expense_records enable row level security;

create policy "expense_records_select_own"
on public.expense_records for select
using (owner_id = auth.uid());

create policy "expense_records_insert_own"
on public.expense_records for insert
with check (owner_id = auth.uid());

create policy "expense_records_update_own"
on public.expense_records for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "expense_records_delete_own"
on public.expense_records for delete
using (owner_id = auth.uid());

create index if not exists expense_records_pet_time_idx
on public.expense_records(pet_id, happened_at desc);
