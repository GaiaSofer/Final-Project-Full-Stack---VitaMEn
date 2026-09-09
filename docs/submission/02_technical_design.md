# VitaMEn — מסמך תכנון טכני (ארכיטקטורה + תכנון מפורט)

## רכיבי המערכת
- **Next.js 14 (App Router)** — גם ה-UI (Server Components) וגם ה-backend
  (Server Actions), באותו פרויקט.
- **Supabase Postgres** — מסד הנתונים, כולל Row Level Security כמנגנון
  ההרשאות המרכזי (לא רק בקוד השרת).
- **Supabase Auth** — ניהול משתמשים, סשן מבוסס עוגיות, מתחדש ב-`middleware.ts`.
- **Vercel** — אירוח/deployment; הפונקציות רצות כ-serverless (stateless בין
  קריאות — משפיע ישירות על החלטת ה-rate-limiting, ראו מסמך אבטחה).

## מסד הנתונים — טבלאות מרכזיות
| טבלה | תפקיד |
|---|---|
| `profiles` | תפקיד (client/admin), שם, נתוני דמוגרפיה לבחירת שורת RDA |
| `supplements` + `supplement_ingredients` | הקטלוג המשותף ורכיביו |
| `intake_items` | ה"מחסנית" האישית של לקוח |
| `intake_logs` | יומן נטילה יומי (טבלה שגדלה הכי מהר — ראו מסמך סקייל) |
| `medical_recommendations` | יעד אישי שקבע רופא ללקוח (בסיס להתרעה הירוקה) |
| `product_requests`, `comments`, `tips` | בקשות מוצר, תגובות, טיפים יומיים |
| `catalog_audit_log` | מי הוסיף/ערך פריט קטלוג ומתי (יומן פעולות אדמין) |

כל הטבלאות תחת Row Level Security; ראו `supabase/migrations/0001_init.sql`
עד `0007_audit_log.sql` להגדרה המלאה כולל כל ה-policies.

## עמודים באפליקציה
`/login`, `/signup` (ציבורי) · `/today`, `/stack`, `/browse`, `/product/[id]`,
`/profile` (client) · `/catalog` (admin, מוגן בקוד + RLS).

## API / Server Actions מרכזיים
- `auth.ts` — `signUp` / `signIn` / `signOut`, כולל ניתוב לפי תפקיד
  (`homeForRole`, ב-`src/lib/business/role-routing.ts` — פונקציה טהורה,
  נבדקת בנפרד מה-server action עצמו).
- `intake.ts` — ניהול מחסנית + סימון נטילה.
- `catalog.ts` — `addSupplement` (עוטף את ה-RPC הטרנזקציוני), `importFromCsv`,
  וכתיבת רשומת audit log לאחר כל פעולה מוצלחת.
- `/api/gaigi` — נקודת קצה אחת לעוזר גאיגי; שכבה דקה מעל אותה לוגיקה
  עסקית קיימת (`compareByIngredient`, `findCheaperAlternatives`,
  `DOSAGE_REFERENCE`) — לא קורא ל-LLM חיצוני ולא ממציא נתונים.

## זרימת מידע Frontend ↔ Backend ↔ Database
Server Components קוראים ישירות מ-Supabase דרך עוגיית ה-session (`server.ts`
יוצר קליינט שמכבד RLS אוטומטית לפי המשתמש המחובר). כתיבות עוברות דרך Server
Actions בלבד — אין קריאת כתיבה ישירה מהדפדפן למסד הנתונים. RLS הוא שכבת
ההגנה הסופית והבלתי-תלויה-בקוד: גם אם מישהו יעקוף את ה-UI ויקרא ל-API
ישירות, ה-RLS עדיין חוסם.

## משתמשים והרשאות
שני תפקידים בלבד (`user_role` enum): `client`, `admin`. ההפרדה מיושמת
בשלוש שכבות בו-זמנית (הגנה מדורגת, לא נקודת כשל יחידה):
1. **Route groups** — `(client)`/`(admin)` בקוד ה-Next.js.
2. **בדיקת תפקיד בעמוד עצמו** — למשל `CatalogPage` בודק
   `profile.role !== 'admin'` ומפנה ל-`/today` (נבדק אוטומטית, ראו מסמך
   בדיקות).
3. **RLS + בדיקת תפקיד בפונקציית ה-DB** — `add_supplement()` זורק חריגה
   אם המשתמש אינו admin, בנוסף ל-policy נפרד על הטבלה עצמה.

## ספריות/שירותים חיצוניים ולמה
- `@supabase/ssr` + `@supabase/supabase-js` — הדרך הרשמית לחבר Supabase
  ל-Server Components של Next.js App Router עם ניהול session נכון.
- `vitest` — בדיקות יחידה מהירות, ללא תלות ב-Jest/Babel config נוסף.
- Anthropic API (אופציונלי, ל-Gaigi) — משמש רק כ"מנתח כוונה" קליל מעל
  לוגיקה קיימת, לא כמקור למידע על מוצרים או מינונים (ראו למה בהמשך מסמך
  זה ובמסמך האפיון).

## ניהול State
State צד-לקוח מינימלי בכוונה: רוב הדף הוא Server Component; הטפסים
משתמשים ב-`useState` מקומי לסטטוס טעינה/הצלחה/שגיאה בלבד (ראו
`src/lib/safe-action.ts` ו-`IntakeButton`/`RemoveButton`). אין ספריית
state גלובלית — אין בה צורך בהיקף הנוכחי.

## טיפול בשגיאות
כל Server Action עובר דרך `withFallback` (`src/lib/safe-action.ts`): תופס
כל חריגה ומחזיר `{ error }` ידידותי במקום קריסה, תוך העברת אותות פנימיים
של Next (`redirect`/`notFound`) הלאה בלי לפגוע בהם. רכיבי הכפתורים בודקים
את התוצאה בפועל (לא מניחים הצלחה), כך שגם כשל שקט מוצג למשתמש.

## ולידציות קלט
`src/lib/validation.ts` — בדיקת אימייל/שדות חובה לפני קריאה ל-Supabase;
בנוסף CHECK constraints במסד הנתונים עצמו (למשל `price_cents >= 0`,
`age between 0 and 120`) כקו הגנה אחרון שלא תלוי בקוד השרת.

## חוויית משתמש מרכזית
עמוד "היום" הוא מסך הבית ללקוח (checklist יומי + היסטוריה), עם ניווט
מודע-תפקיד (`TopNav`) כך שלקוח ומנהל רואים תפריט שונה. באנר קבוע ("המלצה,
לא ייעוץ רפואי") מופיע בכל עמוד.
