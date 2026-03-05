-- ===============================
-- GARMIN ACTIVITIES
-- ===============================

create table if not exists public.garmin_activities (

  id bigserial primary key,

  garmin_user_id text not null,
  summary_id text not null,
  activity_id bigint,

  activity_type text,
  activity_name text,

  start_time timestamptz,
  start_time_in_seconds bigint,

  duration_seconds double precision,
  moving_duration_seconds double precision,

  distance_meters double precision,

  average_speed_mps double precision,
  max_speed_mps double precision,

  average_pace_min_per_km double precision,

  average_hr_bpm double precision,
  max_hr_bpm double precision,

  active_kilocalories double precision,

  total_elevation_gain_m double precision,
  total_elevation_loss_m double precision,

  device_name text,

  manual boolean,
  is_web_upload boolean,

  raw_json jsonb not null,

  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists garmin_activities_unique
on public.garmin_activities (garmin_user_id, summary_id);



-- ===============================
-- GARMIN ACTIVITY DETAILS
-- ===============================

create table if not exists public.garmin_activity_details (

  id bigserial primary key,

  garmin_user_id text not null,
  summary_id text not null,
  activity_id bigint,

  start_time timestamptz,

  device_name text,

  samples jsonb not null,

  raw_json jsonb not null,

  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists garmin_activity_details_unique
on public.garmin_activity_details (garmin_user_id, summary_id);