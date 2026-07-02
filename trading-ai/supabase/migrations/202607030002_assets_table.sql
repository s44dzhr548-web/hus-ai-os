-- Asset universe persistence (optional — synced from seed when Supabase configured)
create table if not exists public.assets (
  symbol text primary key,
  display_symbol text not null,
  name text not null,
  market text not null,
  category text not null,
  exchange text not null,
  sector text not null default '',
  industry text not null default '',
  country text not null default '',
  currency text not null default 'USD',
  provider text not null default 'yahoo',
  is_active boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.assets enable row level security;
