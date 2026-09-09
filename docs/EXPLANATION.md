# VitaMEn — explanation & requirements mapping

A supplement-oversight web app. The market is unregulated and people take many
supplements at once with no visibility into overlapping doses. VitaMEn lets a
person track everything they take, warns them before a combined daily dose
crosses a safe limit, and compares prices across brands.

Two roles:
- **client** — tracks their own supplement "stack", logs daily intake, gets
  overdose warnings, compares prices, and finds cheaper alternatives.
- **admin** — maintains the shared catalog (supplements, ingredients, prices
  across brands = the market data, and a short explanation per supplement).

This document is also the backbone for the five required submission documents;
each section maps to one. Split it into separate files for submission.

> Honesty note: this repo is a **complete, runnable code implementation**, not a
> submitted product. Two steps need your own accounts — creating the Supabase
> project and deploying to Vercel — and are covered under "What you must do".

---

## 1. Product specification (אפיון מוצר)

- Problem: the supplement market is unregulated; people take many products
  daily and unknowingly exceed safe doses of shared ingredients.
- Users: clients (track intake) and admins (maintain the catalog).
- Value: safety (overdose prevention) + cost (price comparison across brands).
- Core flows: sign up as client/admin; client adds supplements to their stack;
  automatic overdose check across the stack; daily "took it" checklist + history;
  browse catalog by goal; compare prices by ingredient; find cheaper alternatives;
  admin adds catalog supplements with ingredients.

## 2. Software architecture (ארכיטקטורה)

- Components: Next.js App Router (UI + server actions), Supabase Postgres (data),
  Supabase Auth (identity).
- Tables: `profiles`, `supplements`, `supplement_ingredients`, `intake_items`
  (a client's stack), `intake_logs` (daily log), `catalog_audit_log`
  (admin actions on the catalog — who/what/when).
- Pages: `/login`, `/signup`, `/stack` + `/today` + `/browse` (client),
  `/catalog` (admin).
- Data flow: Server Components read via the user's auth cookie; writes go through
  Server Actions; RLS is the final gate on every read and write.

## 3. Detailed technical design (תכנון טכני מפורט)

- Folder structure: see `README.md` (carried over; route groups `(client)`/`(admin)`).
- Business logic (pure, tested): `src/lib/business/overlap.ts` (overdose check),
  `compare.ts` (price ranking + cheaper alternatives).
- CRUD via server actions: `intake.ts` (stack + log), `catalog.ts` (admin add).
- Transaction: `add_supplement()` inserts a supplement + all its ingredients
  atomically; any failure rolls back.
- Validation: `src/lib/validation.ts`, server-side before writes.

## 4. Testing specification + implementation (בדיקות)

- Automated, 35 tests across 8 files (`npm test`), verified passing on
  2026-09-06:
  - `overlap.test.ts` (7) — overdose flagged over limit, clear under limit,
    undefined ingredient ignored, price ranking cheapest-first, cheaper-
    alternative detection (incl. match-quality-before-price ranking).
  - `safety.test.ts` (4) — the RED/YELLOW/GREEN engine.
  - `pills-label.test.ts` (2) — Hebrew singular/plural for pill counts.
  - `engine.test.ts` (11) — Gaigi: never returns a product outside the
    catalog, quotes reference values as cited fact, intent detection.
  - `role-routing.test.ts` (3) — **sign-up/sign-in role routing**
    (`homeForRole`: admin→/catalog, client→/today, unknown role→/today,
    defensively).
  - `(admin)/catalog/page.test.ts` (2) — **a client cannot open `/catalog`**
    (redirected to `/today`), and an unauthenticated visitor is redirected
    to `/login`, before any catalog data is ever queried.
  - `(client)/today/page.test.ts` (3) — **pagination on `/today`**: the
    history query is bounded with Supabase `.range()` per the requested
    page (page 0 → rows 0-9, page 2 → rows 20-29), and a negative or
    non-numeric `?page` can't underflow before row 0.
- **Not an automated test, by design — documented manual/integration test
  instead:** "a non-admin cannot call `add_supplement`". The enforcement is
  two real, independent layers in Postgres itself — the RLS policy `"admin
  writes supplements"` on the `supplements`/`supplement_ingredients` tables,
  and an explicit `if not exists (... role = 'admin') then raise exception`
  check inside `add_supplement()` (`0001_init.sql`). Neither can be
  meaningfully exercised by a Vitest unit test, because Vitest never talks
  to a real Postgres — a test that mocks the Supabase client to "reject
  when role != admin" would only prove the mock does what it was told, not
  that the database does. Verify this by hand instead, directly against the
  REST API (no app code changes needed — this app never exposes a
  `supabase` object on `window`, so a browser-console call would not work):
  ```bash
  # 1) sign in as a CLIENT account, get an access token
  curl -s -X POST 'https://<project>.supabase.co/auth/v1/token?grant_type=password' \
    -H "apikey: <anon-key>" -H "Content-Type: application/json" \
    -d '{"email":"<client-email>","password":"<client-password>"}' \
    | grep -o '"access_token":"[^"]*' | cut -d'"' -f4
  # 2) call the admin-only RPC as that client
  curl -s -X POST 'https://<project>.supabase.co/rest/v1/rpc/add_supplement' \
    -H "apikey: <anon-key>" -H "Authorization: Bearer <access_token-from-step-1>" \
    -H "Content-Type: application/json" \
    -d '{"p_name":"x","p_brand":"x","p_price_cents":100,"p_currency":"ILS","p_purpose":[],"p_info":"","p_ingredients":[]}'
  ```
  Expected: a response containing "only admins can add catalog items", and
  no new row in `supplements`.
- Run: `npm test`.

## 5. Basic scale (סקייל)

- `intake_logs` is the fast-growing table; composite index
  `(client_id, taken_at desc)` + `.range()` pagination on `/today`.
- Catalog reads are small and seeded; at thousands of rows they'd need search +
  pagination (described as future work).
- `purpose` uses a GIN index for browse-by-goal filtering.

## 6. Basic security (אבטחה)

- Auth: Supabase email+password, session cookies refreshed in `middleware.ts`.
- Authorization: role checks + route groups, enforced by **RLS**.
- Data isolation: a client's `intake_items`/`intake_logs` are gated by
  `client_id = auth.uid()`; the catalog is writable only by admins. Holds even if
  the API is called directly.
- Secrets: only the anon key is public (RLS protects data); service-role key is
  used only for seeding, never shipped to the browser.
- Rate limiting / brute-force protection: Supabase Auth enforces its own
  rate limits on sign-in and sign-up attempts at the service level, ahead of
  the application. This matters specifically because the app runs on Vercel as
  stateless serverless functions — an application-level limiter that counts
  requests in an in-memory variable would not work here, since there is no
  memory shared between invocations; each request can hit a fresh instance
  with an empty counter. Relying on the auth provider's own limiting avoids
  that failure mode entirely rather than reimplementing it incorrectly.
  **Known gap, stated explicitly rather than left silent:** this covers
  login/sign-up only. The Server Actions for intake logging and catalog
  writes (`intake.ts`, `catalog.ts`) have no request-rate limiting of their
  own — a signed-in user could script repeated calls. They are still safe
  from a *data* standpoint (RLS confines every write to that user's own
  rows, or to admins for the catalog), just not from a *volume-abuse*
  standpoint. Mitigation for a future version: Vercel's own edge rate
  limiting (or Supabase's Postgres-backed `pg_net`/a `rate_limits` table
  keyed by `auth.uid()`), not an in-memory counter, for the reason above.
- Audit trail for admin actions: `catalog_audit_log` (`0007_audit_log.sql`,
  repaired by `0008_audit_log_fix.sql` and `0009_audit_log_admin_default.sql`)
  records who added a supplement or ran a CSV import, and when. `admin_id`
  is set two ways: the application code (`catalog.ts`) sends it explicitly
  on every insert, and the column also carries `default auth.uid()` in the
  database as a second layer, so a row can't be attributed to anyone other
  than whoever was actually signed in at insert time even if some future
  code path forgets to set it. (The DB-level default was itself found
  missing in `0008` during live testing — `0007` never having actually run
  against the project meant `0008`'s `create table if not exists` created
  the column without a default; `0009` restores it. See
  `docs/submission/05_security.md` for the full story.) **Verified live**
  (gaia): signed in as admin, added a product, and confirmed 4 new
  `catalog_audit_log` rows carrying a real `admin_id` — done before the
  separate `middleware.ts` fix below even existed, so this specifically
  confirms `writeAuditLog`'s own fix, independent of the 503 question. RLS on the table
  restricts both read and write to admins, same boundary as the catalog
  itself. This is the admin-side equivalent of `intake_logs`, which already
  gave clients a full history of their own actions.
- Dependency risk — partially fixed, rest documented as a conscious
  decision: `next@14.2.5` had a disclosed security advisory — `npm
  install` printed it directly
  (https://nextjs.org/blog/security-update-2025-12-11). Upgraded to
  `14.2.35` (latest 14.2.x patch, same minor line — no App Router API
  changes) on 2026-09-06; `npm test` (32/32) and `npm run build` both
  verified clean on the new version. That fixed the specific advisory
  the installer had flagged — but `npm audit` on 14.2.35 still reports 8
  vulnerabilities (3 moderate, 4 high, 1 critical) affecting the whole
  14.x line; the only fix is `next@16.3.4`, a breaking major upgrade
  (`npm audit fix --force` says so explicitly). Deliberately not done
  this close to submission — a major-version bump with no time to
  re-verify every route is a bigger risk than the vulnerabilities it
  would close, for a project of this scope. See §6 / the security
  document for the full reasoning; this is a documented trade-off, not
  an oversight.

---

## Requirements vs. implementation

| # | Assignment requirement | Status | Where |
|---|------------------------|--------|-------|
| 1 | Web product with real business value | Done | §1 |
| 2 | Product specification | Done | §1 |
| 3 | Software architecture | Done | §2 + README |
| 4 | Detailed technical design | Done | §3 |
| 5 | Next.js + TypeScript | Done | `src/app/**` |
| 5 | Supabase DB (+ Auth) | Done | `0001_init.sql`, `src/lib/supabase/*` |
| 5 | Deployed on Vercel (live URL) | **You do this** | "What you must do" |
| 6 | Testing specification | Done | §4 |
| 7 | Test implementation | Done (35 automated tests, 8 files) | `src/**/*.test.ts`; §4 |
| 8 | Basic scale | Done | §5 (index + pagination live) |
| 9 | Basic security | Done | §6 (RLS live) |
| 10 | Live link + repo + run instructions | **You do this** | below |
| 11 | Optional AI agents | Used to build; you must understand it | whole repo |
| 12 | 10–15 min presentation | **You do this** | use §1–§6 as script |

Two roles, RLS, and an atomic transaction are all present — the technical spine
the rubric rewards. The "You do this" rows need your own accounts.


---

## v1 progress (steps 1-3 built)

Built and passing (type-check + build + 9 unit tests):
- Two roles (client/admin), RLS, atomic `add_supplement` transaction.
- Safety engine `safety.ts`: RED (daily intake over the official UL ceiling,
  phrased as a cited fact), YELLOW (ingredient overlap across products),
  GREEN (met a doctor-entered target). Frequency-aware: pills/time x times/week.
- Dosage reference `dosage-reference.ts`: RDA targets (from the MoH/FDA RDI PDF)
  + UL ceilings (from NIH). **UL values are marked for your verification.**
- Profile: age/sex/pregnancy (selects a DRI row, not a personal dose) + the
  doctor-recommendation editor.
- Permanent disclaimer banner on every page ("recommendation, not medical advice").
- Catalog: price range (min-max), origin (IL/abroad), source link, category;
  filters (search, category, origin, cheapest/expensive/newest/oldest); product
  cards with 4- or 2-per-row views; full product page; cheaper alternatives;
  comments (each user edits/deletes only their own); product-request to admin
  with a thank-you; CSV bulk import + template (docs/catalog_template.csv).

Step 4 (built): Gaygi chat agent + original SVG avatar.
- `GaygiAvatar.tsx`: original illustration (not a Memoji/photo).
- `/gaygi` chat + `/api/gaygi` route: a THIN layer over existing logic. Claude's
  only tools query the real catalog (search_by_ingredient, find_cheaper_alternatives,
  browse_by_purpose) and run the same pure functions the app uses. It never
  invents products or doses, and gives recommendations, not medical advice.
- Needs ANTHROPIC_API_KEY (and optional GAYGI_MODEL) to run; the rest of the app
  works without it.

Solo scope note: for a single submitter, the graded spine (2 roles, RLS,
transaction, safety engine, catalog) is complete. The agent, comments, CSV
import and dual views are extras that raise polish, not the core grade.


---

## Bug fixes (auth / RLS / session)

Three real bugs surfaced when the app was first deployed against a live
Supabase project. All three are fixed; none of them were in the data model or
the business logic.

**1. "permission denied for table profiles" on signup.**
RLS policies decide *which rows* a role may touch, but Postgres separately
requires a table-level GRANT saying the role may touch the table at all. The
`authenticated` role had policies (from 0001/0002) but no GRANT, so every insert
was rejected before RLS was even evaluated.
Fix: `0004_grants_fix.sql` grants table access to `authenticated`. RLS still
restricts rows — the grant only opens the door that RLS then guards.

**2. Profile rows were never created (`profiles` was empty).**
The original `signUp` created the profile row from the browser right after
`auth.signUp()`. That insert races the session: at that moment `auth.uid()` is
not always populated yet, so the insert failed silently against the
own-profile RLS policy. Every account ended up with no role.
Fix: `0003_auth_trigger.sql` adds an `on_auth_user_created` trigger that creates
the profile inside the database, reading role and name from the signup metadata.
It runs as `security definer`, so it is not subject to the timing/RLS race.
`signUp` now passes `{ role, full_name }` into `auth.signUp` options.

**3. "duplicate key violates profiles_pkey".**
Once the trigger existed, both the trigger *and* the leftover client-side insert
tried to create the same row.
Fix: the manual insert was removed from `signUp` — the trigger owns profile
creation.


**4. Saved rows did not appear until a second attempt.**
`addToStack` (and the other mutations) correctly inserted the row and called
`revalidatePath`, but the forms invoke the server action from a plain `onClick`
handler. In that path `revalidatePath` marks the server cache stale without the
browser router re-rendering the current route, so the row was saved but invisible
— which looked like a failed write.
Fix: the client components call `router.refresh()` after a successful action.
UI-layer only; no change to the actions, the schema or RLS.

Related: `signIn` / `signUp` / `signOut` now call `revalidatePath('/', 'layout')`
before redirecting, so the new session cookie is picked up immediately instead
of the next render still seeing the previous role.

## UI/UX layer (rebuilt)

Presentation only — the data model, RLS policies, the `add_supplement`
transaction and every function under `src/lib/business/` are untouched, and the
9 unit tests still pass unchanged.

- **Design system** (`globals.css`): CSS custom properties for surfaces, text,
  brand/accent and semantic colours; one radius/shadow scale; components for
  cards, buttons, forms, tables, badges, alerts, product cards and chat bubbles.
  Pastel palette, RTL document direction.
- **`TopNav`**: role-aware navigation. This fixes a real usability gap — a client
  previously had no visible route to the catalog. Clients now see
  היום / הרשימה שלי / קטלוג / גאיגי / פרופיל; admins see catalog management.
- **Catalog**: real product cards (thumbnail, name, brand, category, price
  range) in a responsive grid, with the 4-per-row / 2-per-row toggle, and the
  filter bar rebuilt as a labelled form.
- **Stack**: the red/yellow/green engine output is now rendered as distinct
  alert components with explicit copy ("חריגה מהסף היומי", "חפיפת רכיב",
  "הגעת ליעד"), plus an explicit all-clear state.
- **Forms**: every action has a busy state and an inline success/error result,
  so the user is never left guessing whether something saved.
- **Empty states**: stack, catalog, history, comments and requests each explain
  what to do next instead of showing a blank panel.


---

## Gaigi — the assistant (deterministic, no LLM)

Gaigi answers questions about the catalog. She is **not** an LLM wrapper: there
is no model call, no API key, and no per-request cost.

**Why this is a design decision, not a limitation.** The whole product rests on
"recommendation, not medical advice". A language model, even under a strict
system prompt, can phrase something that reads as personalised dosage advice.
A rule engine cannot: every sentence Gaigi produces is either a row from the
catalog or a number from the official reference table. There are no
hallucinations to guard against, and the demo never fails on a rate limit or an
expired key.

**How it works** (`src/lib/gaigi/engine.ts`):
1. `detectIntent()` normalises the text and matches it against a Hebrew/English
   alias table (ויטמין D / vitamin d / vitd → `Vitamin D`), longest alias first
   so "B12" is not swallowed by "B". It recognises four intents: ingredient
   lookup, cheaper alternatives, official guideline, and catalog ingredient list.
2. `answer()` dispatches to functions that already existed and were already
   tested — `compareByIngredient`, `findCheaperAlternatives`, and the
   `DOSAGE_REFERENCE` table. Gaigi adds no new business logic.
3. The reply is structured, not free text: message, mood, optional product
   cards, optional follow-up suggestions.

**Unknown input is answered honestly.** If nothing matches, Gaigi says she did
not understand and offers examples. If the catalog has no product with the
requested ingredient, she says so and suggests sending a request to the admin —
she never fabricates a product.

**Delivery: a floating widget, not a page.** Gaigi is mounted from
`src/app/(client)/layout.tsx` as a fixed-position button in the corner of every
client screen. Clicking it opens a compact chat panel over the current page, so
the user never loses their place — asking "is there a cheaper alternative?"
while looking at their stack does not navigate away from it. There is no
`/gaigi` route and no nav entry.

**The avatar reflects real state.** Because the engine is deterministic it knows
exactly what happened, so the expression is driven by the outcome: thinking
while querying, happy on a hit, sad on no match, neutral for a reference
lookup. Five illustrated PNGs in `public/gaigi/`.

Covered by 8 unit tests in `src/lib/gaigi/engine.test.ts`, including the two
that matter most: it never returns a product outside the catalog, and it quotes
the reference values as cited fact.


---

## Catalog at scale, and quick add-to-stack

**Server-side filtering, sorting and pagination.** The catalog page previously
selected every supplement and filtered in memory — fine for six rows, wrong for
six hundred. Search, category and origin are now pushed into the SQL query,
sorting is `ORDER BY`, and only one page of twelve rows is fetched with
`.range()`. `count: 'exact'` returns the total in the same round trip, so the
pager needs no second query. The response size is now constant regardless of
catalog size.

`0005_catalog_indexes.sql` adds the indexes those queries rely on: `price_cents`
and `created_at` for the sort options, `origin` for the filter, and pg_trgm GIN
indexes on `name` and `brand` — the latter are what make a leading-wildcard
`ILIKE '%term%'` search usable instead of a sequential scan.

**Quick add-to-stack.** A client looking at a product had to navigate to the
stack page and re-select that product from a dropdown. The product page now has
an "add to my stack" button that expands into the two fields that are actually
still unknown — pills per time and times per week — and calls the same
`addToStack` action. No new logic, one less round trip through the UI.

**Missing products are requested from inside the chat.** When Gaigi cannot
answer from the catalog — no product with that ingredient, or an unrecognised
product name — she offers to file a request with the admin, and the button
calls the existing `requestProduct` action. This is deliberately the answer to
"the product is not in the catalog": a human, verified path, rather than
fetching unverified ingredients from the open web. Web lookup was considered and
rejected, because the moment Gaigi repeats ingredient data from an unverified
source, the safety argument that justifies the whole product collapses.


---

## Admin-managed daily tips

Tips shown to clients on the "today" page are stored in a `tips` table and
maintained by the admin from the catalog screen — not hard-coded. This mirrors
the catalog's trust model: every tip is human-approved, so nothing unverified
reaches users, but the admin can update them continuously without a code change.

`0006_tips.sql` adds the table with the same RLS shape as the catalog: any
logged-in user reads active tips; only admins insert, update or delete. The
today page selects the active tips and shows one per day, chosen by day-of-year
so it is stable within a day and identical on server and client (no hydration
mismatch). If there are no tips, the card simply does not render.


---

## Server Action error handling (fixes intermittent 503 on "mark as taken")

**Symptom:** clicking "סמן כנלקח" on /today sometimes returned a 503 /
"Internal Server Error" on the first try and succeeded on the second; RSC
fetches for /today occasionally failed the same way.

**Root cause:** every Server Action (`intake.ts`, `auth.ts`, `catalog.ts`,
`comments.ts`, `profile.ts`, `requests.ts`, `tips.ts`) called Supabase directly
with no `try/catch` anywhere in the file. A transient failure talking to
Supabase — a dropped connection, a DNS hiccup, a slow first request — threw an
exception with nothing to catch it. An uncaught exception inside a Server
Action is what Next.js turns into the crashed response the browser reported as
503/"Internal Server Error". The retry "worked" only because the network blip
had already passed.

**Fix:** `src/lib/safe-action.ts` adds one small helper, `withFallback`, that
every action's body now runs through. It catches any thrown error and returns
a normal `{ error: 'אירעה תקלה זמנית בשרת. נסי שוב בעוד רגע.' }` result instead
of crashing — while still re-throwing Next's internal `redirect()` /
`notFound()` signals untouched, so sign-in/sign-up navigation is unaffected.

This turns a hard crash into an ordinary, retryable error the UI already knows
how to display. Which exposed a second, separate bug: `IntakeButton`,
`RemoveButton` and `RequestDoneButton` called their action and *always*
assumed success — they never checked the result, so even a properly-returned
`{ error }` was silently ignored and the UI showed "✓ done" regardless. All
three now check the result and show the message inline if it failed, with the
button left enabled to retry.

Nothing about the business logic, RLS, or the database changed — this is
error-handling only, isolated to the Server Actions and the three buttons that
call them directly.

**Update:** a second, separate unguarded call of the same class was found and
fixed today — `src/lib/supabase/middleware.ts`'s `getUser()`, which runs on
every request *before* any Server Action or `withFallback` even starts. See
`docs/submission/05_security.md` for the full story, including the honest
caveat that this specific fix has not yet been confirmed against the live 503
Gaia reported (no working Supabase credentials in this environment to test
with) — the `admin_id`/audit-log fix nearby, by contrast, **has** been
confirmed live by Gaia.


---

## Hebrew singular/plural for pill counts

Hebrew doesn't just append a count to a plural noun the way English does —
"1 כדורים" is grammatically wrong; it must read "כדור אחד". `pillsLabel()` in
`src/lib/business/pills-label.ts` is the single place that decides this: exactly
one pill gets the singular "כדור אחד", any other count gets "N כדורים". Used on
/today, /stack, and in the auto-generated dosage text from the quick-add form
on the product page, so the three places a pill count is shown can't drift out
of sync with each other. Covered by a small unit test.


---

## Two small UI fixes + a real ranking improvement

**Redundant sentence removed** from the "missing product" card on /stack — it
duplicated what the form right below it already says.

**Layout overlap fixed** in the doctor-recommendation form (`RecommendationsEditor`).
Root cause: the shared `.inline-form` CSS rule applies `min-width: 130px; flex: 1`
to every `input`/`select` inside it, but this form's "כמות"/"יחידה" fields sat in
wrapper `div`s constrained to 90–100px. The 130px minimum was winning, pushing
the field wider than its slot and overlapping the next one. Fixed by setting
`width` and `minWidth: 0` directly on the input/select elements (inline styles
always beat the class rule), instead of relying on a wrapper div's `maxWidth`.

**Gaigi's "cheaper alternatives" now ranks by match quality first, price second.**
Previously `findCheaperAlternatives` only sorted by price per unit of the main
ingredient — a product sharing just one ingredient with the original could
outrank one sharing all of them, just for being cheaper. It now:
1. Filters to products containing the main ingredient, cheaper per unit than the target (unchanged).
2. Ranks by **how many of the target's ingredients each alternative also has** — the closer match wins.
3. Within the same match quality, cheapest first.

The product page's alternatives table now shows a "3/3 רכיבים"-style match badge
so this ranking is visible, not just implicit in the order. Covered by two new
tests: a fuller ingredient match beats a cheaper partial match, and within an
equal match count price still breaks the tie.
