-- ============================================================
-- VitaMEn — migration 0004: table grants (bug fix)
--
-- BUG: signup failed with "permission denied for table profiles".
-- CAUSE: RLS policies decide WHICH ROWS a role may touch, but Postgres also
--        needs a table-level GRANT saying the role may touch the table at all.
--        The `authenticated` role had policies but no GRANT, so every insert
--        was rejected before RLS was even evaluated.
-- FIX:   grant table access to the authenticated role. RLS still restricts the
--        rows — this only opens the door that RLS then guards.
--
-- Nothing here weakens RLS: every policy from 0001/0002 stays exactly as-is.
-- ============================================================

grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- Also apply to anything created later.
alter default privileges in schema public
  grant all on tables to authenticated;
alter default privileges in schema public
  grant all on sequences to authenticated;

-- Re-assert the own-profile insert policy (unchanged semantics: a user may
-- only ever insert a profile row whose id equals their own auth.uid()).
drop policy if exists "own profile insert" on profiles;
create policy "own profile insert" on profiles
  for insert with check (id = auth.uid());
