-- ============================================================
-- VitaMEn — migration 0008 (audit log fix + idempotent repair)
-- Run AFTER 0007_audit_log.sql (or run this alone — it's safe either way,
-- see below).
--
-- Two real problems found testing against a live project:
--
-- 1) `admin_id uuid not null default auth.uid() references profiles(id)
--    on delete set null` in 0007 is self-contradictory: `on delete set
--    null` can never fire while the column is `not null` — deleting a
--    profile that has audit rows would raise a foreign-key error instead
--    of nulling the reference. Fixed below by dropping `not null`: an
--    audit log should survive the admin who wrote it being deleted later,
--    with admin_id becoming null ("deleted admin") rather than blocking
--    the delete or losing the row.
--
-- 2) The audit log appeared to "not write anything, silently" when tested
--    live. The application code no longer swallows that error (see
--    src/app/actions/catalog.ts), but the table/policies from 0007 also
--    need to actually exist on THIS project. This migration is written to
--    be safe to run whether or not 0007 ever ran here:
-- ============================================================

create table if not exists catalog_audit_log (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references profiles(id) on delete set null,
  action         text not null check (action in ('add_supplement', 'csv_import', 'update_supplement')),
  supplement_id  uuid references supplements(id) on delete set null,
  detail         jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

-- If 0007 already ran on this project, this repairs the contradictory
-- constraint in place. If it didn't, the table was just created above
-- without the bad constraint, so this is a no-op.
alter table catalog_audit_log alter column admin_id drop not null;

create index if not exists idx_audit_created on catalog_audit_log(created_at desc);

alter table catalog_audit_log enable row level security;

-- drop+recreate so this is safe to run again, and safe even if 0007's
-- policies exist already under the same names.
drop policy if exists "admin reads audit log" on catalog_audit_log;
drop policy if exists "admin writes audit log" on catalog_audit_log;

create policy "admin reads audit log" on catalog_audit_log for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admin writes audit log" on catalog_audit_log for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- VERIFY (run these two manually after the above, as the logged-in admin,
-- e.g. in the Supabase SQL editor while impersonating, or just check they
-- return without error):
--   select * from catalog_audit_log limit 1;
--   insert into catalog_audit_log (admin_id, action, detail)
--     values (auth.uid(), 'add_supplement', '{"test":true}'::jsonb);
-- If the first line errors with "relation ... does not exist", neither
-- 0007 nor this migration ran yet — run this file. If it errors with a
-- permissions/RLS message while logged in as a genuine admin account,
-- the admin's `profiles.role` is not actually 'admin' — check that row.
-- ============================================================
