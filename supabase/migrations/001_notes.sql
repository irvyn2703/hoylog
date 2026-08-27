-- Applied remotely via Supabase MCP. Kept here as source of truth.

create extension if not exists pgcrypto with schema extensions;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text,
  body text not null,
  color text not null default 'yellow',
  occurred_on date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_type_check check (type in ('progress', 'evergreen')),
  constraint notes_color_check check (color in ('yellow', 'pink', 'mint', 'lilac', 'peach')),
  constraint notes_occurred_on_check check (
    (type = 'progress' and occurred_on is not null)
    or (type = 'evergreen' and occurred_on is null)
  )
);

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null,
  name text not null default 'Cursor',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint api_tokens_token_hash_key unique (token_hash)
);

create index idx_notes_user_type_occurred on public.notes (user_id, type, occurred_on desc);
create index idx_api_tokens_user_id on public.api_tokens (user_id);

alter table public.notes enable row level security;
alter table public.api_tokens enable row level security;
alter table public.notes force row level security;
alter table public.api_tokens force row level security;
