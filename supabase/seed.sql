-- Seed the catalog. Run AFTER 0001_init.sql and 0002_v1_features.sql.
-- Multiple brands per ingredient = market comparison; varied category/origin
-- so the filters have something to show. price_cents is the MINIMUM price.
--
-- 14 products across 9 ingredients, at least 2 brands each for every
-- ingredient the safety engine watches (Vitamin D, Magnesium, Caffeine,
-- Zinc, Iron — see src/lib/business/overlap.ts DAILY_LIMITS and
-- src/lib/business/dosage-reference.ts DOSAGE_REFERENCE), so "compare
-- prices" / "cheaper alternative" and the overdose/overlap warnings all
-- have real data to demonstrate against, not a single row each.
insert into supplements (id, name, brand, price_cents, price_max_cents, currency, purpose, info, origin, source_url, category) values
  ('11111111-1111-1111-1111-111111111111','Omega-3','Now',8900,10500,'ILS','{heart,brain}','חומצות שומן לתמיכה בלב ובמוח.','abroad','https://example.com/omega3-now','omega'),
  ('12121212-1212-1212-1212-121212121212','Omega-3 Triple Strength','Solgar',11900,13200,'ILS','{heart,brain}','ריכוז גבוה של EPA/DHA.','israel','https://example.com/omega3-solgar','omega'),
  ('22222222-2222-2222-2222-222222222222','Magnesium','Solgar',6500,7200,'ILS','{sleep,muscle}','מגנזיום, עשוי לתמוך בשינה ובשריר.','israel','https://example.com/mag-solgar','sleep'),
  ('33333333-3333-3333-3333-333333333333','Magnesium','Now',5200,5900,'ILS','{sleep,muscle}','מגנזיום זול יותר, מינון גבוה לכמוסה.','abroad','https://example.com/mag-now','sleep'),
  ('34343434-3434-3434-3434-343434343434','Magnesium Glycinate','Altman',7800,8600,'ILS','{sleep,muscle}','מגנזיום ביסגלינאט, ספיגה גבוהה.','israel','https://example.com/mag-altman','sleep'),
  ('44444444-4444-4444-4444-444444444444','Vitamin D3','Altman',4200,4800,'ILS','{immunity,bone}','ויטמין D לתמיכה בעצם ובחיסון.','israel','https://example.com/d3-altman','vitamin'),
  ('45454545-4545-4545-4545-454545454545','Vitamin D3 4000IU','Now',3900,4400,'ILS','{immunity,bone}','מינון גבוה, כמוסה ליום.','abroad','https://example.com/d3-now','vitamin'),
  ('55555555-5555-5555-5555-555555555555','Energy Complex','Solgar',7400,8100,'ILS','{energy}','קפאין וויטמיני B לאנרגיה.','israel','https://example.com/energy-solgar','energy'),
  ('56565656-5656-5656-5656-565656565656','Pre-Workout Energy','Now',6200,6900,'ILS','{energy}','קפאין טהור למתאמנים.','abroad','https://example.com/energy-now','energy'),
  ('67676767-6767-6767-6767-676767676767','Zinc Picolinate','Solgar',3400,3900,'ILS','{immunity}','אבץ לתמיכה במערכת החיסון.','israel','https://example.com/zinc-solgar','vitamin'),
  ('68686868-6868-6868-6868-686868686868','Zinc','Now',2600,3100,'ILS','{immunity}','אבץ, מינון סטנדרטי.','abroad','https://example.com/zinc-now','vitamin'),
  ('78787878-7878-7878-7878-787878787878','Iron Complex','Altman',3800,4300,'ILS','{energy}','ברזל לתמיכה ברמות אנרגיה, בעיקר לנשים.','israel','https://example.com/iron-altman','vitamin'),
  ('89898989-8989-8989-8989-898989898989','Vitamin C 1000mg','Now',3200,3700,'ILS','{immunity}','ויטמין C במינון גבוה, נוגד חמצון.','abroad','https://example.com/c-now','vitamin'),
  ('90909090-9090-9090-9090-909090909090','Daily Multivitamin','Solgar',9800,10900,'ILS','{immunity,energy}','מולטי-ויטמין יומי, כולל ברזל ואבץ.','israel','https://example.com/multi-solgar','vitamin');

insert into supplement_ingredients (supplement_id, ingredient_name, amount, unit) values
  ('11111111-1111-1111-1111-111111111111','Omega-3',1000,'mg'),
  ('11111111-1111-1111-1111-111111111111','Vitamin D',45,'mcg'),
  ('12121212-1212-1212-1212-121212121212','Omega-3',1500,'mg'),
  ('22222222-2222-2222-2222-222222222222','Magnesium',200,'mg'),
  ('33333333-3333-3333-3333-333333333333','Magnesium',250,'mg'),
  ('34343434-3434-3434-3434-343434343434','Magnesium',300,'mg'),
  ('44444444-4444-4444-4444-444444444444','Vitamin D',25,'mcg'),
  ('45454545-4545-4545-4545-454545454545','Vitamin D',100,'mcg'),
  ('55555555-5555-5555-5555-555555555555','Caffeine',200,'mg'),
  ('56565656-5656-5656-5656-565656565656','Caffeine',300,'mg'),
  ('67676767-6767-6767-6767-676767676767','Zinc',15,'mg'),
  ('68686868-6868-6868-6868-686868686868','Zinc',11,'mg'),
  ('78787878-7878-7878-7878-787878787878','Iron',18,'mg'),
  ('89898989-8989-8989-8989-898989898989','Vitamin C',1000,'mg'),
  ('90909090-9090-9090-9090-909090909090','Iron',18,'mg'),
  ('90909090-9090-9090-9090-909090909090','Zinc',11,'mg'),
  ('90909090-9090-9090-9090-909090909090','Vitamin C',60,'mg');
