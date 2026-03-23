create table if not exists public.push_tokens (
  id bigserial primary key,
  expo_push_token text not null unique,
  platform text not null,
  active_provider text,
  garmin_user_id text not null,
  strava_athlete_id bigint,
  updated_at timestamptz not null default now()
);
