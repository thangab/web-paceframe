alter table public.push_tokens
alter column garmin_user_id drop not null;

create index if not exists push_tokens_strava_athlete_id_idx
on public.push_tokens (strava_athlete_id);
