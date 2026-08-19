alter table public.install_photos
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_delete_token text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'install_photos_storage_provider_check'
      and conrelid = 'public.install_photos'::regclass
  ) then
    alter table public.install_photos
      add constraint install_photos_storage_provider_check
      check (storage_provider in ('supabase', 'r2'));
  end if;
end
$$;

comment on column public.install_photos.storage_provider is
  'Object storage backend: supabase for existing files, r2 for Cloudflare R2 files.';

comment on column public.install_photos.storage_delete_token is
  'Per-object R2 deletion capability token; null for Supabase-backed files.';
