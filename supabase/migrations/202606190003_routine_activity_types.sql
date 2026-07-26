alter table public.activity_records
drop constraint if exists activity_records_type_check;

alter table public.activity_records
add constraint activity_records_type_check
check (type in (
  'feed',
  'walk',
  'medicine',
  'alert',
  'litter',
  'deworm',
  'deworm-internal',
  'deworm-external',
  'vaccine'
));
