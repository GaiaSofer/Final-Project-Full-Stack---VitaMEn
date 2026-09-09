-- ============================================================
-- VitaMEn — migration 0006: admin-managed daily tips
--
-- Tips are curated content the admin maintains from the UI, exactly like the
-- catalog: every tip is human-approved, so nothing unverified reaches users.
-- Clients read active tips; only admins write. Same RLS pattern as supplements.
-- ============================================================

create table if not exists tips (
  id         uuid primary key default gen_random_uuid(),
  body       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table tips enable row level security;

-- everyone logged in may read active tips
drop policy if exists "read active tips" on tips;
create policy "read active tips" on tips
  for select using (active = true or exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- only admins may create / update / delete
drop policy if exists "admin writes tips" on tips;
create policy "admin writes tips" on tips
  for all using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  )) with check (exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

grant all on tips to authenticated;

-- seed a few starter tips (admin can edit or remove these)
insert into tips (body) values
  ('מומלץ לצרוך ברזל בסמוך לוויטמין C, כי הוא משפר את ספיגת הברזל.'),
  ('סידן וברזל מתחרים על אותה ספיגה. עדיף לא לקחת אותם באותה הנטילה.'),
  ('ויטמין D נספג טוב יותר יחד עם ארוחה שמכילה שומן.'),
  ('ישנם כמה סוגי מגנזיום (ציטרט, גליצינאט, אוקסיד) שנספגים בשיעורים שונים.'),
  ('ויטמינים מסיסי-שומן (A, D, E, K) נאגרים בגוף, לכן חשוב לא לחרוג מהסף היומי.')
on conflict do nothing;
