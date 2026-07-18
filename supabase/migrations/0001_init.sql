-- Snag schema: jobs / steps / findings, multi-tenant with row-level security.
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,   -- null = anonymous demo run
  url text not null,
  status text not null default 'queued',
  persona text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists steps (
  id bigint generated always as identity primary key,
  job_id uuid not null references jobs on delete cascade,
  n int not null,
  action jsonb,
  thought text,
  screenshot_path text,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists findings (
  id bigint generated always as identity primary key,
  job_id uuid not null references jobs on delete cascade,
  kind text not null,
  severity text not null,
  title text not null,
  detail text,
  evidence jsonb,
  repro jsonb,
  screenshot_path text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists steps_job_idx on steps (job_id, n);
create index if not exists findings_job_idx on findings (job_id);
create index if not exists jobs_user_idx on jobs (user_id, created_at desc);

alter table jobs enable row level security;
alter table steps enable row level security;
alter table findings enable row level security;

-- Jobs: owners manage their own; anonymous demo jobs are world-readable by id.
drop policy if exists "jobs owner all" on jobs;
create policy "jobs owner all" on jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "jobs demo read" on jobs;
create policy "jobs demo read" on jobs
  for select using (user_id is null);

-- Steps/findings inherit access from their parent job.
drop policy if exists "steps via job" on steps;
create policy "steps via job" on steps
  for select using (
    exists (
      select 1 from jobs j
      where j.id = steps.job_id
        and (j.user_id = auth.uid() or j.user_id is null)
    )
  );

drop policy if exists "findings via job" on findings;
create policy "findings via job" on findings
  for select using (
    exists (
      select 1 from jobs j
      where j.id = findings.job_id
        and (j.user_id = auth.uid() or j.user_id is null)
    )
  );

-- Writes to jobs/steps/findings happen through the server with the service-role
-- key (which bypasses RLS), so no INSERT policies are granted to anon/authenticated.

-- Storage bucket for screenshots. Private — screenshots can capture
-- authenticated hunts, so they are served only via signed URLs. Create once:
insert into storage.buckets (id, name, public)
values ('shots', 'shots', false)
on conflict (id) do nothing;
