alter table public.strava_activities
add column if not exists photo_fetched_at timestamptz;
