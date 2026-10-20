-- HISN initial schema: profiles, targets, scans, findings + Row Level Security.
-- Identity comes from Supabase Auth (auth.users); we never store passwords.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ar')),
  created_at timestamptz not null default now()
);

create table public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  url text not null check (url ~ '^https?://' and char_length(url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, url)
);
create index targets_user_id_idx on public.targets (user_id);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_id uuid not null references public.targets (id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);
create index scans_target_id_idx on public.scans (target_id, started_at desc);
create index scans_user_id_idx on public.scans (user_id, started_at desc);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  check_key text not null,
  title text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  description text not null,
  evidence text not null,
  remediation text not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  status text not null check (status in ('passed', 'failed', 'info', 'inconclusive')),
  created_at timestamptz not null default now()
);
create index findings_scan_id_idx on public.findings (scan_id);

-- Keep updated_at current on edits.
create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger targets_updated_at before update on public.targets
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a user signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: every table is locked down; users see only their rows.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.targets enable row level security;
alter table public.scans enable row level security;
alter table public.findings enable row level security;

create policy "profiles: own row" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: update own row" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "targets: own rows" on public.targets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Scans: readable by owner. Inserting requires owning the target too, so a
-- user cannot attach a scan to someone else's target id.
create policy "scans: read own" on public.scans
  for select using (user_id = auth.uid());
create policy "scans: insert for own target" on public.scans
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.targets t where t.id = target_id and t.user_id = auth.uid())
  );
create policy "scans: update own" on public.scans
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "scans: delete own" on public.scans
  for delete using (user_id = auth.uid());

-- Findings: access is decided by ownership of the parent scan AND its target.
create policy "findings: read via own scan" on public.findings
  for select using (
    exists (
      select 1 from public.scans s join public.targets t on t.id = s.target_id
      where s.id = scan_id and s.user_id = auth.uid() and t.user_id = auth.uid()
    )
  );
create policy "findings: insert via own running scan" on public.findings
  for insert with check (
    exists (
      select 1 from public.scans s join public.targets t on t.id = s.target_id
      where s.id = scan_id and s.user_id = auth.uid() and t.user_id = auth.uid()
        and s.status = 'running'
    )
  );
