create table if not exists public.garmin_user_permissions (
  id bigserial primary key,
  garmin_user_id text not null,
  permissions jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists garmin_user_permissions_garmin_user_id_unique_idx
  on public.garmin_user_permissions (garmin_user_id);
