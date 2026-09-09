-- ============================================================
-- VitaMEn — migration 0002 (v1 features)
-- Additive: run AFTER 0001_init.sql. Extends the schema for:
--   profile demographics (age/sex/life-stage -> picks a DRI reference row,
--     NOT a personal calorie/dose calculation)
--   doctor's recommendations per client (-> green "target reached")
--   intake frequency (pills per time + times per week -> daily average)
--   catalog: price range, origin, source link, category
--   product requests (client -> admin) and product comments
-- ============================================================

create type sex_type    as enum ('male', 'female');
-- life stage only selects which DRI column applies; not a personal calc
create type life_stage   as enum ('none', 'pregnant', 'breastfeeding_0_6', 'breastfeeding_7_12');
create type origin_type  as enum ('israel', 'abroad');
create type request_status as enum ('open', 'done');

-- profiles: add demographics (all optional; used only to pick a DRI row)
alter table profiles add column sex        sex_type;
alter table profiles add column age        integer check (age >= 0 and age <= 120);
alter table profiles add column stage      life_stage not null default 'none';

-- doctor's recommendation the client enters -> basis for the GREEN message
create table medical_recommendations (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references profiles(id) on delete cascade,
  ingredient_name text not null,
  target_amount   numeric not null check (target_amount >= 0),
  unit            text not null,
  note            text,
  created_at      timestamptz not null default now()
);
create index idx_medrec_client on medical_recommendations(client_id);

-- intake frequency -> lets the engine compute an average DAILY dose.
-- daily = ingredient_amount * pills_per_time * times_per_week / 7
alter table intake_items add column pills_per_time numeric not null default 1 check (pills_per_time > 0);
alter table intake_items add column times_per_week integer not null default 7 check (times_per_week between 1 and 7);

-- catalog: price range (price_cents from 0001 is treated as the MINIMUM),
-- plus origin, source link, and a single category for browse-by-type.
alter table supplements add column price_max_cents integer check (price_max_cents >= 0);
alter table supplements add column origin          origin_type;
alter table supplements add column source_url      text;
alter table supplements add column category        text;  -- 'vitamin','sleep','hair',...
create index idx_supp_category on supplements(category);

-- client asks admin to add a missing product
create table product_requests (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references profiles(id) on delete cascade,
  product_name text not null,
  note         text,
  status       request_status not null default 'open',
  created_at   timestamptz not null default now()
);
create index idx_req_status on product_requests(status);

-- client reviews on a catalog product
create table comments (
  id            uuid primary key default gen_random_uuid(),
  supplement_id uuid not null references supplements(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index idx_comments_supp on comments(supplement_id);

-- ============================================================
-- RLS for the new tables
-- ============================================================
alter table medical_recommendations enable row level security;
alter table product_requests        enable row level security;
alter table comments                enable row level security;

-- medical recs: strictly private to the client
create policy "client manages own recs" on medical_recommendations for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());

-- product requests: client creates/reads own; admin reads all and updates status
create policy "client creates requests" on product_requests for insert with check (client_id = auth.uid());
create policy "client reads own requests" on product_requests for select using (client_id = auth.uid());
create policy "admin reads all requests" on product_requests for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admin updates requests" on product_requests for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- comments: everyone logged in reads; author manages only their own
create policy "read comments"   on comments for select using (auth.role() = 'authenticated');
create policy "author writes"   on comments for insert with check (author_id = auth.uid());
create policy "author edits"    on comments for update using (author_id = auth.uid());
create policy "author deletes"  on comments for delete using (author_id = auth.uid());
