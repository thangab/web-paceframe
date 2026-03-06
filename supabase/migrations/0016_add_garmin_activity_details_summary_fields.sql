-- Détails d'activité Garmin : champs de synthèse transmis dans `summary`
alter table public.garmin_activity_details
add column if not exists activity_type text;

alter table public.garmin_activity_details
add column if not exists activity_name text;

alter table public.garmin_activity_details
add column if not exists start_time_offset_in_seconds bigint;

alter table public.garmin_activity_details
add column if not exists duration_seconds double precision;

alter table public.garmin_activity_details
add column if not exists moving_duration_seconds double precision;

alter table public.garmin_activity_details
add column if not exists distance_meters double precision;

alter table public.garmin_activity_details
add column if not exists average_speed_mps double precision;

alter table public.garmin_activity_details
add column if not exists max_speed_mps double precision;

alter table public.garmin_activity_details
add column if not exists average_pace_min_per_km double precision;

alter table public.garmin_activity_details
add column if not exists max_pace_min_per_km double precision;

alter table public.garmin_activity_details
add column if not exists average_hr_bpm double precision;

alter table public.garmin_activity_details
add column if not exists max_hr_bpm double precision;

alter table public.garmin_activity_details
add column if not exists average_run_cadence_spm double precision;

alter table public.garmin_activity_details
add column if not exists max_run_cadence_spm double precision;

alter table public.garmin_activity_details
add column if not exists active_kilocalories double precision;

alter table public.garmin_activity_details
add column if not exists total_elevation_gain_m double precision;

alter table public.garmin_activity_details
add column if not exists total_elevation_loss_m double precision;

alter table public.garmin_activity_details
add column if not exists steps integer;

alter table public.garmin_activity_details
add column if not exists starting_latitude_in_degree double precision;

alter table public.garmin_activity_details
add column if not exists starting_longitude_in_degree double precision;

alter table public.garmin_activity_details
add column if not exists manual boolean;

alter table public.garmin_activity_details
add column if not exists is_web_upload boolean;

alter table public.garmin_activity_details
add column if not exists start_latlng double precision[];
