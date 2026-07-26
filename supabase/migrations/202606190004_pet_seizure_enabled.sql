alter table public.pets
add column if not exists seizure_enabled boolean not null default false;

-- Preserve the setting for users created before seizure_enabled became canonical.
update public.pets
set seizure_enabled = true
where has_epilepsy = true
  and seizure_enabled = false;
