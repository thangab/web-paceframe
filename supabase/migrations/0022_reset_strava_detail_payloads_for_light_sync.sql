alter table public.strava_activities
  add column if not exists details_fetched_at timestamptz;

-- Reset previously persisted Strava detail payloads so the new light sync mode
-- starts from summary-only rows. Full details will be fetched again on demand.
update public.strava_activities
set
  start_latlng = null,
  end_latlng = null,
  photo_url = null,
  photos = null,
  laps = null,
  max_heartrate = null,
  heart_rate_samples_count = 0,
  heart_rate_stream = null,
  details_fetched_at = null,
  raw_detail = null,
  updated_at = timezone('utc', now())
where
  start_latlng is not null
  or end_latlng is not null
  or photo_url is not null
  or photos is not null
  or laps is not null
  or max_heartrate is not null
  or heart_rate_samples_count <> 0
  or heart_rate_stream is not null
  or details_fetched_at is not null
  or raw_detail is not null;
