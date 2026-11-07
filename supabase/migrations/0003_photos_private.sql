-- Makes sure the "photos" bucket is PRIVATE (health data: photos of users' meals).
-- Safe to run more than once. Run in Supabase: SQL Editor → New query → paste → Run.

-- 1) Bucket private: files can't be opened with a public URL.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;

-- 2) Remove any storage policy that lets the public (anon) or logged-in users (authenticated)
--    read or write photos. The app only uses the server key, which doesn't need policies.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (roles && array['anon', 'authenticated', 'public']::name[])
      and (coalesce(qual, '') ilike '%photos%' or coalesce(with_check, '') ilike '%photos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
    raise notice 'Dropped storage policy: %', p.policyname;
  end loop;
end $$;

-- 3) Check: should return public = false
select id, public from storage.buckets where id = 'photos';
