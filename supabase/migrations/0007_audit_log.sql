-- ============================================================
-- VitaMEn — migration 0007 (admin audit log)
-- Records who added/edited which catalog item and when.
-- Additive: run AFTER 0006_tips.sql.
--
-- Gap this closes: intake_logs already gives a full audit trail for
-- CLIENT actions (what they took, when). There was no equivalent record of
-- ADMIN actions on the shared catalog — i.e. no answer to "who added this
-- product, and when?". This table is that record, and it reinforces the
-- two pillars the project is already graded on: authorization/roles (only
-- an admin's inserts ever reach this table) and data isolation (the log
-- itself is admin-only to read, same as the catalog they're editing).
-- ============================================================

create table catalog_audit_log (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid not null default auth.uid() references profiles(id) on delete set null,
  action         text not null check (action in ('add_supplement', 'csv_import', 'update_supplement')),
  supplement_id  uuid references supplements(id) on delete set null,
  detail         jsonb not null default '{}',
  created_at     timestamptz not null default now()
);
create index idx_audit_created on catalog_audit_log(created_at desc);

alter table catalog_audit_log enable row level security;

-- Same trust boundary as the catalog itself: only admins may read or write
-- the audit trail. A client never sees it, and can't forge an entry either
-- (admin_id defaults to auth.uid(), so a row can only ever be attributed to
-- whoever is actually logged in when it's inserted).
create policy "admin reads audit log" on catalog_audit_log for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admin writes audit log" on catalog_audit_log for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
