# VitaMEn — supplement oversight app

אפליקציית מעקב ובקרה על תוספי תזונה. שני תפקידים: **client** (עוקב אחרי התוספים שלו) ו-**admin** (מתחזק את הקטלוג המשותף).

Stack: Next.js (App Router) · TypeScript · Supabase (Postgres + Auth) · Vercel.

## חמשת העמודים המוערכים, ואיפה כל אחד נמצא
- הרשאות/roles — `user_role` enum + route groups `(client)`/`(admin)` + RLS.
- בידוד מידע (אבטחה) — RLS ב-`0001_init.sql`; כל שורה נעולה לפי `auth.uid()`.
- לוגיקה עסקית + טרנזקציה — `add_supplement()` (insert אטומי); מנוע `overlap.ts`.
- סקייל — אינדקס על `intake_logs` `(client_id, taken_at desc)` + פאג'ינציה ב-`/today`.
- ולידציה — `price_cents` כמספר שלם, CHECK constraints, ולידציה בצד שרת.

## הרצה מקומית — פעם אחת בלבד

1. **התקנת חבילות** — בטרמינל, בתיקיית הפרויקט: `npm install`
2. **מפתח Supabase** — פותחים `.env.local` (`open -e .env.local`). הכתובת כבר ממולאת; מדביקים רק את המפתח: Supabase → Project Settings → API → "anon public", במקום `YOUR-ANON-KEY-HERE`. שומרים.
3. **מסד הנתונים** — ב-Supabase → SQL Editor, מריצים כל קובץ בנפרד, בסדר הזה (מוחקים את תוכן העורך בכל פעם, מדביקים את הקובץ הבא, Run):
   `0001_init.sql → 0002_v1_features.sql → 0003_auth_trigger.sql → 0004_grants_fix.sql → 0005_catalog_indexes.sql → 0006_tips.sql → 0007_audit_log.sql → 0008_audit_log_fix.sql → 0009_audit_log_admin_default.sql → 0010_supplement_constraints.sql → seed.sql`

   אם כבר הרצתם בעבר רק עד 0004 — חובה להריץ גם 0005–0010 עכשיו: בלעדיהם הקטלוג לא מדופדף, אין טבלת טיפים, אין יומן פעולות אדמין, ואין הגנה מפני מחיר מקסימום נמוך ממינימום או שורות רכיב כפולות.
4. **כיבוי אישור מייל** — Supabase → Authentication → Sign In / Providers → Email → מכבים "Confirm email" → Save.

## הרצה יומיומית
`npm run dev` ואז http://localhost:3000. לעצירה: Ctrl+C (לא Ctrl+Z — זה משאיר את השרת תקוע ברקע).

## בדיקה שהכול עובד
נרשמים כ-admin → אמור להיפתח ניהול קטלוג. מתנתקים → נרשמים עם מייל אחר כ-client → בקטלוג מוסיפים לרשימה גם Omega-3 וגם Vitamin D3 → ב"הרשימה שלי" אמורה להופיע אזהרה צהובה על חפיפת ויטמין D. אם זה עובד — המוצר עובד מקצה לקצה.

## בדיקות אוטומטיות
`npm test` — אמורות לעבור 35 בדיקות (מנוע בטיחות, גאיגי, ניתוב לפי role, הרשאות על `/catalog`, פאג'ינציה ב-`/today`).

## מבנה תיקיות
src/
├── app/
│   ├── (auth)/login/ signup/
│   ├── (client)/ stack/ today/ browse/
│   ├── (admin)/ catalog/
│   ├── actions/ auth.ts intake.ts catalog.ts
│   └── layout.tsx page.tsx globals.css
├── components/ (AddToStackForm, IntakeButton, RemoveButton, AddSupplementForm)
├── lib/
│   ├── supabase/ server.ts client.ts middleware.ts
│   ├── business/ overlap.ts compare.ts overlap.test.ts
│   └── validation.ts
└── types/database.types.ts
supabase/migrations/0001-0010 + seed.sql
middleware.ts · .env.local.example · package.json

## סודות
רק ה-anon key ציבורי (RLS מגן על הדאטה). ה-service-role key משמש רק לזריעה מקומית — לא ב-git, לא בדפדפן.
