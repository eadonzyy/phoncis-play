-- Run this in Supabase Dashboard > SQL Editor.
-- This creates a one-row-per-student progress table with Row Level Security.

create table if not exists public.student_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_progress enable row level security;

-- Students can read only their own progress.
drop policy if exists "Students can read own progress" on public.student_progress;
create policy "Students can read own progress"
  on public.student_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Students can insert only their own progress.
drop policy if exists "Students can insert own progress" on public.student_progress;
create policy "Students can insert own progress"
  on public.student_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Students can update only their own progress.
drop policy if exists "Students can update own progress" on public.student_progress;
create policy "Students can update own progress"
  on public.student_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
