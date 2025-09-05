-- Create table public.sessions to track active users
create table if not exists public.sessions (
  id bigserial primary key,
  user_id text not null,
  email text,
  last_ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_id on public.sessions (user_id);
create index if not exists idx_sessions_updated_at on public.sessions (updated_at);

-- Upsert helper via unique constraint
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='uniq_sessions_user'
  ) then
    create unique index uniq_sessions_user on public.sessions (user_id);
  end if;
end $$;

-- Create table public.app_errors for runtime errors
create table if not exists public.app_errors (
  id bigserial primary key,
  message text not null,
  level text not null default 'error',
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_errors_created_at on public.app_errors (created_at desc);
