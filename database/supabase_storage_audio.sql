-- Phonics Adventure v1.8 Supabase Storage setup
-- Run after database/supabase.sql and database/supabase_admin.sql.
-- Bucket used by .env: VITE_AUDIO_STORAGE_BUCKET=phonics-audio

insert into storage.buckets (id, name, public)
values ('phonics-audio', 'phonics-audio', true)
on conflict (id) do update set public = true;

-- Anyone can read public phonics audio files.
drop policy if exists "phonics_audio_public_read" on storage.objects;
create policy "phonics_audio_public_read"
on storage.objects
for select
using (bucket_id = 'phonics-audio');

-- Only admins listed in public.admin_users can upload/update/delete audio.
drop policy if exists "phonics_audio_admin_insert" on storage.objects;
create policy "phonics_audio_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'phonics-audio'
  and exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
);

drop policy if exists "phonics_audio_admin_update" on storage.objects;
create policy "phonics_audio_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'phonics-audio'
  and exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
)
with check (
  bucket_id = 'phonics-audio'
  and exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
);

drop policy if exists "phonics_audio_admin_delete" on storage.objects;
create policy "phonics_audio_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'phonics-audio'
  and exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.email())
  )
);
