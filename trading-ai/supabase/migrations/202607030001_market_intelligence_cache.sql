-- Market intelligence cache tables (optional persistence layer)
create table if not exists public.company_profiles (
  symbol text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes_cache (
  symbol text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.financials_cache (
  symbol text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.news_cache (
  symbol text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (symbol)
);

create table if not exists public.announcements_cache (
  symbol text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_recommendations (
  symbol text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts_store (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.company_profiles enable row level security;
alter table public.quotes_cache enable row level security;
alter table public.financials_cache enable row level security;
alter table public.news_cache enable row level security;
alter table public.announcements_cache enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.journal_entries enable row level security;
alter table public.alerts_store enable row level security;
