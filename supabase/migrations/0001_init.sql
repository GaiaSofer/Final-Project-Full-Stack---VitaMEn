-- ============================================================
-- VitaMEn — initial schema
-- A supplement-oversight app. Two roles:
--   client = a person tracking the supplements they take
--   admin  = maintains the shared supplement catalog
-- Run this in the Supabase SQL editor, then run seed.sql.
--
-- RLS RULE (the security story): a client can only ever read/write
-- their OWN intake rows. The catalog is readable by everyone but only
-- writable by admins. The database enforces this, not the frontend.
-- ============================================================

create type user_role as enum ('client', 'admin');

-- one row per authenticated user
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'client',
  full_name  text not null,
  created_at timestamptz not null default now()
);

-- shared supplement catalog (admins maintain it)
create table supplements (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  brand       text not null,
  price_cents integer not null check (price_cents >= 0),  -- money as integer cents
  currency    text not null default 'ILS',
  purpose     text[] not null default '{}',  -- e.g. {'sleep','energy'} -> "recommend by problem"
  info        text,                          -- short plain explanation of the supplement
  created_at  timestamptz not null default now()
);
create index idx_supp_purpose on supplements using gin (purpose);

create table supplement_ingredients (
  id              uuid primary key default gen_random_uuid(),
  supplement_id   uuid not null references supplements(id) on delete cascade,
  ingredient_name text not null,
  amount          numeric not null check (amount >= 0),
  unit            text not null              -- 'mg','g','IU'
);
create index idx_ingr_supplement on supplement_ingredients(supplement_id);
create index idx_ingr_name       on supplement_ingredients(ingredient_name);

-- the supplements a client currently takes (their "stack")
create table intake_items (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references profiles(id) on delete cascade,
  supplement_id uuid not null references supplements(id),
  dosage        text not null,   -- '1 capsule'
  schedule      text not null,   -- 'morning'
  created_at    timestamptz not null default now(),
  unique (client_id, supplement_id)
);
create index idx_stack_client on intake_items(client_id);

-- daily "I took it" log (grows fast -> pagination + index story)
create table intake_logs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references profiles(id) on delete cascade,
  supplement_id uuid not null references supplements(id),
  taken_at      timestamptz not null default now(),
  notes         text
);
create index idx_logs_client_time on intake_logs(client_id, taken_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles               enable row level security;
alter table supplements            enable row level security;
alter table supplement_ingredients enable row level security;
alter table intake_items           enable row level security;
alter table intake_logs            enable row level security;

-- profiles: each user manages only their own row
create policy "own profile read"   on profiles for select using (id = auth.uid());
create policy "own profile insert" on profiles for insert with check (id = auth.uid());
create policy "own profile update" on profiles for update using (id = auth.uid());

-- catalog: everyone logged in can read; only admins can write
create policy "read supplements" on supplements for select using (auth.role() = 'authenticated');
create policy "admin writes supplements" on supplements for all
  using   (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "read ingredients" on supplement_ingredients for select using (auth.role() = 'authenticated');
create policy "admin writes ingredients" on supplement_ingredients for all
  using   (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- intake: a client touches only their own rows
create policy "client manages own stack" on intake_items for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "client manages own logs" on intake_logs for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());

-- ============================================================
-- TRANSACTIONAL catalog insert
-- Adds a supplement AND all its ingredients atomically. If any
-- ingredient insert fails, the supplement insert rolls back too.
-- security invoker => RLS applies => only admins can run it.
-- ============================================================
create or replace function add_supplement(
  p_name text, p_brand text, p_price_cents integer, p_currency text,
  p_purpose text[], p_info text,
  p_ingredients jsonb     -- [{"ingredient_name":"...","amount":0,"unit":"..."}]
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_id  uuid;
  v_ing jsonb;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'only admins can add catalog items';
  end if;

  insert into supplements (name, brand, price_cents, currency, purpose, info)
  values (p_name, p_brand, p_price_cents, p_currency, coalesce(p_purpose, '{}'), p_info)
  returning id into v_id;

  for v_ing in select * from jsonb_array_elements(p_ingredients)
  loop
    insert into supplement_ingredients (supplement_id, ingredient_name, amount, unit)
    values (v_id, v_ing->>'ingredient_name', (v_ing->>'amount')::numeric, v_ing->>'unit');
  end loop;

  return v_id;
end;
$$;
