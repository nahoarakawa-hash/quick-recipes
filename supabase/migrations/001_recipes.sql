-- Quick Recipes v1 schema
-- Run in Supabase SQL Editor (or via CLI)

create extension if not exists "pgcrypto";

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  role_tag text,
  status text not null default 'draft'
    check (status in ('draft', 'ready')),
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists recipes_user_archived_idx on public.recipes (user_id, archived);
create index if not exists recipes_user_status_idx on public.recipes (user_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row
  execute function public.set_updated_at();

alter table public.recipes enable row level security;

drop policy if exists "recipes_select_own" on public.recipes;
create policy "recipes_select_own"
  on public.recipes for select
  using (auth.uid() = user_id);

drop policy if exists "recipes_insert_own" on public.recipes;
create policy "recipes_insert_own"
  on public.recipes for insert
  with check (auth.uid() = user_id);

drop policy if exists "recipes_update_own" on public.recipes;
create policy "recipes_update_own"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "recipes_delete_own" on public.recipes;
create policy "recipes_delete_own"
  on public.recipes for delete
  using (auth.uid() = user_id);
