create table if not exists public.garmin_users (
  id bigserial primary key,
  garmin_user_id text not null,
  access_token text not null,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists garmin_users_garmin_user_id_unique_idx
  on public.garmin_users (garmin_user_id);
