-- ============================================================
-- VitaMEn — migration 0005: indexes for catalog browsing at scale
--
-- The catalog page now filters, sorts and paginates in the database
-- (WHERE + ORDER BY + LIMIT/OFFSET) instead of loading every row and
-- filtering in memory. These indexes back the columns those queries use.
--
-- No data model change, no RLS change — indexes only.
-- ============================================================

-- default sort (cheapest / most expensive first)
create index if not exists idx_supp_price       on supplements (price_cents);

-- "newest" / "oldest" sort
create index if not exists idx_supp_created_at  on supplements (created_at desc);

-- origin filter (Israel / abroad)
create index if not exists idx_supp_origin      on supplements (origin);

-- case-insensitive name/brand search (ILIKE '%term%').
-- trigram indexes are what make a leading-wildcard LIKE usable at all.
create extension if not exists pg_trgm;
create index if not exists idx_supp_name_trgm   on supplements using gin (name  gin_trgm_ops);
create index if not exists idx_supp_brand_trgm  on supplements using gin (brand gin_trgm_ops);
