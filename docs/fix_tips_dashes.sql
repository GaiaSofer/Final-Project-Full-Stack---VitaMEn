-- Rewrites the seeded tips so each reads as one clean sentence with no dash.
-- Run once in the SQL Editor. Safe to run again (updates by exact old text).
update tips set body = 'מומלץ לצרוך ברזל בסמוך לוויטמין C, כי הוא משפר את ספיגת הברזל.'
  where body like 'מומלץ לצרוך ברזל%';
update tips set body = 'ישנם כמה סוגי מגנזיום (ציטרט, גליצינאט, אוקסיד) שנספגים בשיעורים שונים.'
  where body like 'ישנם כמה סוגי מגנזיום%';
update tips set body = 'ויטמינים מסיסי-שומן (A, D, E, K) נאגרים בגוף, לכן חשוב לא לחרוג מהסף היומי.'
  where body like 'ויטמינים מסיסי-שומן%';
