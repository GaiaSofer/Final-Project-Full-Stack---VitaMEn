# VitaMEn — מסמך אפיון בדיקות

## מה נבדק, ולמה זה מספיק
35 בדיקות אוטומטיות, 8 קבצים, כולן עוברות (`npm test`, Vitest). המיפוי הבא
הוא לפי סעיפי הדרישה במטלה (פיצ'רים מרכזיים / קלטים לא תקינים / תהליכים
עסקיים / הרשאות / DB / קצוות / UI):

### פיצ'רים מרכזיים ותהליכים עסקיים
- `overlap.test.ts` (7) — מנוע חפיפת רכיבים: חריגה מזוהה נכון, אין
  התרעת-שווא כשאין חריגה, רכיב לא-מוכר לא גורם לקריסה; דירוג מחיר
  מהזול ליקר; זיהוי חלופה זולה יותר, כולל דירוג לפי כמות רכיבים
  משותפים לפני מחיר.
- `safety.test.ts` (4) — מנוע RED/YELLOW/GREEN המלא (כולל תדירות
  נטילה — כדורים/פעם × פעמים/שבוע).
- `pills-label.test.ts` (2) — יחיד/רבים בעברית למספר כדורים (מקרה קצה
  לשוני, לא רק לוגי).
- `engine.test.ts` (11) — גאיגי: לעולם לא מחזיר מוצר שלא בקטלוג, מצטט
  ערכי רפרנס כעובדה מצוטטת, זיהוי כוונה נכון בעברית/אנגלית.

### הרשאות (client vs admin)
- `role-routing.test.ts` (3) — ניתוב אחרי הרשמה/התחברות: admin→/catalog,
  client→/today, ותפקיד לא-מוכר מטופל כברירת מחדל בטוחה (client).
- `(admin)/catalog/page.test.ts` (2) — לקוח מחובר שמנסה לפתוח `/catalog`
  מקבל הפניה ל-`/today` **לפני** שכל שאילתת קטלוג מתבצעת; משתמש לא-מחובר
  מופנה ל-`/login`.

### מסד הנתונים וקצה (pagination)
- `(client)/today/page.test.ts` (3) — שאילתת ההיסטוריה ב-`/today` מוגבלת
  בפועל עם `.range()` לפי העמוד המבוקש (עמוד 0 → שורות 0-9, עמוד 2 →
  שורות 20-29), וקלט `page` שלילי או לא-מספרי לא "מציף" לפני שורה 0.

### קלטים לא תקינים
מכוסה בשילוב `src/lib/validation.ts` (נבדק דרך זרימת ה-signup/signin) +
CHECK constraints במסד הנתונים (`price_cents >= 0`, `age between 0 and 120`
וכו') שנבדקים בפועל בכל insert.

## מה מכוסה כבדיקה ידנית מתועדת, ולא אוטומטית — ולמה
**"לקוח לא יכול לקרוא ל-`add_supplement` (RLS)".** האכיפה בפועל היא ב-
Postgres עצמו: policy על הטבלה + בדיקת role מפורשת בתוך הפונקציה
(`0001_init.sql`). Vitest אף פעם לא מדבר עם Postgres אמיתי, אז "בדיקה"
שממוקקת את קליינט ה-Supabase ומחזירה שגיאה כשה-role אינו admin הייתה
מוכיחה רק שה-mock עושה מה שהתבקש — לא שה-DB אכן חוסם. לכן זו בדיקה ידנית:

האפליקציה לא חושפת אובייקט `supabase` על `window`, אז קריאה מקונסולת
הדפדפן לא תעבוד — הבדיקה מול ה-REST API ישירות (בלי שינוי קוד):

```bash
# 1) התחברות עם חשבון client, קבלת access token
curl -s -X POST 'https://<project>.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: <anon-key>" -H "Content-Type: application/json" \
  -d '{"email":"<client-email>","password":"<client-password>"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4

# 2) קריאה ל-RPC המוגן כאילו אנחנו אותו client
curl -s -X POST 'https://<project>.supabase.co/rest/v1/rpc/add_supplement' \
  -H "apikey: <anon-key>" -H "Authorization: Bearer <access-token-משלב-1>" \
  -H "Content-Type: application/json" \
  -d '{"p_name":"x","p_brand":"x","p_price_cents":100,"p_currency":"ILS","p_purpose":[],"p_info":"","p_ingredients":[]}'
```

**תוצאה צפויה:** תשובה שמכילה "only admins can add catalog items", ואין
שורה חדשה בטבלת `supplements`.

תיעוד התוצאה בפועל (הרצה + צילום מסך/פלט) לפני ההגשה נשאר על השולח —
זו בדיוק הבדיקה שהמטלה מתכוונת אליה ב"בדיקות ידניות מתועדות, במקומות
שבהם זה מתאים".

**"לקוח א' לא יכול לקרוא/לגעת בשורות של לקוח ב'"** — אותה סיבה בדיוק
(RLS אמיתי, לא ניתן ל-mock משמעותי). דורש שני חשבונות client אמיתיים,
לא admin. לכל טבלה עם בידוד לפי `client_id`/`author_id`
(`medical_recommendations`, `product_requests`, `comments`,
`intake_items`, `intake_logs`): מתחברים כ-B (שלב 1 למעלה, עם הפרטים של
B) ומנסים select על שורה שידוע ש-A יצר:

```bash
curl -s 'https://<project>.supabase.co/rest/v1/product_requests?select=*' \
  -H "apikey: <anon-key>" -H "Authorization: Bearer <access-token-של-B>"
```

**תוצאה צפויה:** רשימה ריקה או רק שורות של B — לעולם לא שורה שיצר A.
אותו דבר ל-update/delete על `id` ספציפי של שורת A דרך
`?id=eq.<uuid-של-A>` — צפוי 0 שורות שהושפעו, לא שגיאה ולא הצלחה שקטה.
לגבי `comments`: כל client (גם לא-author) אמור **לקרוא** הכל (`read
comments` היא `for select using (auth.role() = 'authenticated')`) אבל
**לא לערוך/למחוק** תגובה שאינה שלו — שני החלקים צריכים בדיקה נפרדת.
לגבי `tips`: client לא-admin לא אמור לראות tip עם `active = false` בשום
תגובת API, גם אם ה-id שלו נחשף איכשהו במסך אחר.

## בדיקות UI בסיסיות
מצבי ריק (empty states) מטופלים בכל מסך מרכזי (מחסנית, קטלוג, היסטוריה,
תגובות, בקשות) עם טקסט מנחה מה לעשות הלאה, במקום מסך ריק סתמי — נבדק
ידנית מול כל תרחיש (חשבון חדש, קטלוג ריק).

## איך מריצים
```
npm test
```
מריץ את כל 35 הבדיקות בכ-1-2 שניות (`vitest run`, ללא תלות ברשת או ב-DB
אמיתי — כל הבדיקות משתמשות בפונקציות טהורות או ב-mock ל-Supabase/Next).
