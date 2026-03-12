create table if not exists public.garmin_oauth_sessions (
  state text primary key,
  code_verifier text not null,
  mobile_redirect_uri text,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists garmin_oauth_sessions_expires_at_idx
  on public.garmin_oauth_sessions (expires_at);
