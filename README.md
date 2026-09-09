# VitaMEn — architecture overview

A supplement-oversight app. Roles: **client** (tracks their own supplements) and
**admin** (maintains the shared catalog).

Stack: Next.js (App Router) · TypeScript · Supabase (Postgres + Auth) · Vercel.

## Folder structure
```
vitamen/
├── src/
│   ├── app/
│   │   ├── (auth)/login/ signup/
│   │   ├── (client)/ stack/ today/ browse/
│   │   ├── (admin)/ catalog/
│   │   ├── actions/ auth.ts intake.ts catalog.ts
│   │   ├── layout.tsx  page.tsx  globals.css
│   ├── components/  (AddToStackForm, IntakeButton, RemoveButton, AddSupplementForm)
│   ├── lib/
│   │   ├── supabase/ server.ts client.ts middleware.ts
│   │   ├── business/ overlap.ts compare.ts overlap.test.ts
│   │   └── validation.ts
│   └── types/database.types.ts
├── supabase/ migrations/0001-0010  seed.sql
├── middleware.ts  .env.local.example  package.json  README.md
```

## The 5 graded pillars, and where each lives
1. Authorization/roles — `user_role` enum + route groups `(client)`/`(admin)` + RLS.
2. Data isolation (security) — RLS in `0001_init.sql`; every row gated by `auth.uid()`.
3. Business logic + transactions — `add_supplement()` atomic insert; `overlap.ts` safety engine.
4. Scale — `intake_logs` index `(client_id, taken_at desc)` + pagination on `/today`.
5. Validation — integer `price_cents`, CHECK constraints, server-side validation.

## Local run
1. `npm install`
2. `cp .env.local.example .env.local`, fill the two `NEXT_PUBLIC_SUPABASE_*` values.
3. In Supabase SQL editor: run every file in `supabase/migrations/` in order
   (0001 → 0010), then `supabase/seed.sql`. If a project already had 0001-0004
   run, 0005-0010 still need to run — 0008, 0009 and 0010 in particular fix
   real bugs found testing against a live project (see their own header
   comments).
4. `npm run dev` → http://localhost:3000
5. `npm test` runs the unit tests.

## Secrets
Only the anon key is public (RLS protects data). The service-role key is for
seeding only and is never committed or sent to the browser.
