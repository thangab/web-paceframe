alter table public.garmin_activity_details
add column if not exists start_latlng double precision[];

-- Optionnel : vérifie que le tableau contient exactement 2 valeurs
alter table public.garmin_activity_details
add constraint start_latlng_length_check
check (
  start_latlng is null
  or array_length(start_latlng, 1) = 2
);