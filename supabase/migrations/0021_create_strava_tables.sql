create table if not exists public.strava_users (
  athlete_id bigint primary key,
  username text,
  firstname text,
  lastname text,
  city text,
  state text,
  country text,
  profile_medium text,
  profile text,
  access_token text,
  refresh_token text,
  expires_at bigint,
  raw jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists strava_users_updated_at_idx
  on public.strava_users (updated_at desc);

create table if not exists public.strava_activities (
  activity_id bigint primary key,
  athlete_id bigint not null references public.strava_users (athlete_id) on delete cascade,
  name text not null,
  distance double precision not null default 0,
  moving_time integer not null default 0,
  elapsed_time integer not null default 0,
  total_elevation_gain double precision not null default 0,
  type text not null,
  start_date timestamptz not null,
  timezone text,
  average_speed double precision not null default 0,
  average_cadence double precision,
  average_heartrate double precision,
  max_heartrate double precision,
  kilojoules double precision,
  calories double precision,
  location_city text,
  location_state text,
  location_country text,
  device_name text,
  summary_polyline text,
  start_latlng jsonb,
  end_latlng jsonb,
  photo_url text,
  photos jsonb,
  laps jsonb,
  heart_rate_samples_count integer not null default 0,
  heart_rate_stream jsonb,
  raw_summary jsonb,
  raw_detail jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists strava_activities_athlete_start_idx
  on public.strava_activities (athlete_id, start_date desc);

create index if not exists strava_activities_updated_at_idx
  on public.strava_activities (updated_at desc);
