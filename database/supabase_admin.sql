-- Phonics Adventure v1.3 後台內容管理 SQL
-- 請在 Supabase SQL Editor 執行

create table if not exists public.site_content (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
alter table public.admin_users enable row level security;

-- 允許所有人讀取網站內容（前台顯示用）
drop policy if exists "site_content_select_all" on public.site_content;
create policy "site_content_select_all"
on public.site_content
for select
using (true);

-- 只有管理員可新增 / 修改 / 刪除網站內容
drop policy if exists "site_content_admin_all" on public.site_content;
create policy "site_content_admin_all"
on public.site_content
for all
using (
  exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
);

-- 已登入使用者可查看 admin_users，方便後台顯示
-- 實務上可再收緊權限

drop policy if exists "admin_users_select_authenticated" on public.admin_users;
create policy "admin_users_select_authenticated"
on public.admin_users
for select
using (auth.role() = 'authenticated');

-- 只有既有管理員可新增/刪除其他管理員
drop policy if exists "admin_users_manage_admins" on public.admin_users;
create policy "admin_users_manage_admins"
on public.admin_users
for all
using (
  exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
);

-- 初始化一筆主網站內容
insert into public.site_content (key, data)
values ('main', '{}'::jsonb)
on conflict (key) do nothing;

-- 初始化第一位管理員，請改成你的登入 email
insert into public.admin_users (email)
values ('you@example.com')
on conflict (email) do nothing;

-- v1.4: teacher dashboard roles
create table if not exists public.teacher_users (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.teacher_users enable row level security;

drop policy if exists "teacher_users_select_authenticated" on public.teacher_users;
create policy "teacher_users_select_authenticated"
on public.teacher_users
for select
using (auth.role() = 'authenticated');

drop policy if exists "teacher_users_manage_admins" on public.teacher_users;
create policy "teacher_users_manage_admins"
on public.teacher_users
for all
using (
  exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
);

-- 初始化第一位教師，請改成你的教師 email
insert into public.teacher_users (email)
values ('teacher@example.com')
on conflict (email) do nothing;
