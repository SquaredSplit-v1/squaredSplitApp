create table public.otp_rate_limits (
  phone                text        not null primary key,
  attempt_count        int         not null default 1,
  window_start         timestamptz not null default now(),
  last_attempt         timestamptz not null default now(),
  locked_until         timestamptz,
  verify_attempts      int         not null default 0,
  verify_locked_until  timestamptz
);

create index otp_rate_limits_window_idx on public.otp_rate_limits(window_start);