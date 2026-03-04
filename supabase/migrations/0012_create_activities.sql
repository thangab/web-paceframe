create table if not exists public.activities (
  id bigserial primary key,
  user_id text not null,
  provider text not null,
  provider_activity_id text not null,
  activity_type text,
  distance double precision,
  duration double precision,
  pace double precision,
  device_name text,
  start_time timestamptz,
  raw_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists activities_provider_provider_activity_id_unique_idx
  on public.activities (provider, provider_activity_id);

create index if not exists activities_user_id_idx
  on public.activities (user_id);

create index if not exists activities_start_time_idx
  on public.activities (start_time desc);
