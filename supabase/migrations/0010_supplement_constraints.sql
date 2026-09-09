-- ============================================================
-- VitaMEn — migration 0010 (two schema gaps found reading the live
-- production schema's Definition tab directly, not from docs/code)
--
-- 1) supplements: price_max_cents had its own `>= 0` check, but nothing
--    stopped price_max_cents < price_cents (e.g. min=100, max=50). Added
--    as NOT VALID: it starts enforcing on every INSERT/UPDATE from now on,
--    but does not scan (or reject this migration over) existing rows —
--    safe to run even if a bad row already exists live. Run the SELECT
--    below first if you want to know whether one does.
--
-- 2) supplement_ingredients: had `amount >= 0` but no uniqueness, so two
--    CSV rows for the same product + same ingredient + same unit created
--    two DB rows instead of one merged row — inflating that product's own
--    ingredient content (src/app/actions/catalog.ts now merges these on
--    import going forward; this repairs anything already live). This
--    migration merges existing same-unit duplicates (summing their
--    amounts into one row, deleting the rest) BEFORE adding the
--    constraint, so it's safe to run regardless of current data. A
--    same-ingredient-different-unit pair is intentionally left untouched
--    (not a safe auto-merge) and does NOT block the constraint, which is
--    scoped to (supplement_id, ingredient_name, unit).
--
-- FIXED after a real failure running this against production: the first
-- version used `min(id)` to pick which duplicate row to keep. `id` is
-- `uuid`, and uuid has no natural ordering in Postgres — there is no
-- `min()`/`max()` aggregate defined for it at all (error 42883, caught by
-- gaia actually running this). Rewritten below using `row_number() over
-- (... order by id::text)` — uuid cast to text sorts fine as text, and
-- this was only ever an arbitrary tiebreak (which duplicate row's id
-- survives doesn't matter, only that exactly one does and its amount is
-- the sum) so there's no correctness change, only a working query.
-- Verified against a real local Postgres 16 before shipping this version:
-- seeded Zinc 20+20+5mg and Iron 10mg+10IU, ran this file, confirmed Zinc
-- merged to 45mg, Iron stayed two separate rows, and a fresh duplicate
-- insert was rejected by the constraint.
-- ============================================================

-- --- 1) price range sanity, going forward -----------------------------
-- Diagnostic (run manually first if you want to see violators — this
-- migration does not depend on the answer):
--   select id, name, price_cents, price_max_cents from supplements
--   where price_max_cents is not null and price_max_cents < price_cents;

alter table supplements drop constraint if exists chk_price_range;
alter table supplements add constraint chk_price_range
  check (price_max_cents is null or price_max_cents >= price_cents)
  not valid;

-- --- 2) merge existing same-unit duplicate ingredient rows -------------
-- rn = 1 is the row we keep (arbitrary but deterministic: lowest id as
-- text); total_amount is the sum across every duplicate in that group,
-- including the kept row itself.
with dups as (
  select id, supplement_id, ingredient_name, unit,
         row_number() over (
           partition by supplement_id, ingredient_name, unit
           order by id::text
         ) as rn,
         sum(amount) over (
           partition by supplement_id, ingredient_name, unit
         ) as total_amount
  from supplement_ingredients
)
update supplement_ingredients si
set amount = d.total_amount
from dups d
where si.id = d.id and d.rn = 1;

with dups as (
  select id, supplement_id, ingredient_name, unit,
         row_number() over (
           partition by supplement_id, ingredient_name, unit
           order by id::text
         ) as rn
  from supplement_ingredients
)
delete from supplement_ingredients si
using dups d
where si.id = d.id and d.rn > 1;

-- --- now safe to add: no (supplement_id, ingredient_name, unit) dup left
create unique index if not exists uq_ingredient_supp_name_unit
  on supplement_ingredients (supplement_id, ingredient_name, unit);

-- ============================================================
-- VERIFY:
--   select id, name, price_cents, price_max_cents from supplements
--     where price_max_cents is not null and price_max_cents < price_cents;
--   -- expect 0 rows for anything inserted/updated AFTER this migration
--   -- (existing bad rows, if any, are NOT VALID so are still allowed to
--   -- exist — see note above; run
--   --   alter table supplements validate constraint chk_price_range;
--   -- once you've manually fixed or accepted any pre-existing ones, to
--   -- turn this into a fully-enforced constraint)
--
--   select supplement_id, ingredient_name, unit, count(*)
--   from supplement_ingredients group by 1,2,3 having count(*) > 1;
--   -- expect 0 rows, always (this one has no NOT VALID escape hatch)
-- ============================================================
