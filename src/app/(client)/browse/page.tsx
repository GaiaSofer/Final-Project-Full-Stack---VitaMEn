import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import RequestProductForm from '@/components/RequestProductForm';
import type { Supplement } from '@/types/database.types';

const PAGE_SIZE = 12;

// Catalog with SERVER-SIDE filtering, sorting and pagination.
// Search, category and origin are pushed into the SQL query, and only one page
// of rows is fetched (`range`), so the payload stays constant as the catalog
// grows. `count: 'exact'` gives the total for the pager without a second query.
export default async function BrowsePage({ searchParams }: {
  searchParams: { q?: string; category?: string; origin?: string; sort?: string; view?: string; page?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const page = Math.max(0, parseInt(searchParams.page ?? '0', 10) || 0);
  const sort = searchParams.sort ?? 'cheapest';
  const view = searchParams.view === '2' ? '2' : '4';

  // Category list for the filter dropdown (small, distinct set).
  const { data: catRows } = await supabase.from('supplements').select('category');
  const cats = Array.from(new Set((catRows ?? [])
    .map((r: { category: string | null }) => r.category).filter(Boolean))) as string[];

  let query = supabase
    .from('supplements')
    .select(
      'id, name, brand, price_cents, price_max_cents, currency, purpose, info, origin, source_url, category, created_at',
      { count: 'exact' },
    );

  if (searchParams.category) query = query.eq('category', searchParams.category);
  if (searchParams.origin)   query = query.eq('origin', searchParams.origin);
  if (searchParams.q) {
    const term = searchParams.q.replace(/[%,]/g, ' ').trim();
    if (term) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
  }

  if (sort === 'cheapest')       query = query.order('price_cents', { ascending: true });
  else if (sort === 'expensive') query = query.order('price_cents', { ascending: false });
  else if (sort === 'newest')    query = query.order('created_at', { ascending: false });
  else if (sort === 'oldest')    query = query.order('created_at', { ascending: true });

  const from = page * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const supps = (data ?? []) as Supplement[];
  const total = count ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  const pageLink = (p: number) => ({ query: { ...searchParams, page: String(p) } });

  function priceLabel(s: Supplement) {
    const min = (s.price_cents / 100).toFixed(0);
    const max = s.price_max_cents ? (s.price_max_cents / 100).toFixed(0) : null;
    return max && max !== min ? `₪${min}–₪${max}` : `₪${min}`;
  }
  function initials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>קטלוג תוספים</h1>
        <p className="muted">
          {total} מוצרים{total > PAGE_SIZE ? ` · עמוד ${page + 1} מתוך ${lastPage + 1}` : ''}
        </p>
      </div>

      <div className="card">
        <form className="inline-form">
          <div style={{ flex: 2, minWidth: 170 }}>
            <label>חיפוש</label>
            <input name="q" placeholder="שם מוצר או מותג" defaultValue={searchParams.q ?? ''} style={{ width: '100%' }} />
          </div>
          <div>
            <label>קטגוריה</label>
            <select name="category" defaultValue={searchParams.category ?? ''}>
              <option value="">הכל</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>מקור</label>
            <select name="origin" defaultValue={searchParams.origin ?? ''}>
              <option value="">ישראל / חו״ל</option>
              <option value="israel">ישראל</option>
              <option value="abroad">חו״ל</option>
            </select>
          </div>
          <div>
            <label>מיון</label>
            <select name="sort" defaultValue={sort}>
              <option value="cheapest">הזול ביותר</option>
              <option value="expensive">היקר ביותר</option>
              <option value="newest">החדש ביותר</option>
              <option value="oldest">הישן ביותר</option>
            </select>
          </div>
          <input type="hidden" name="view" value={view} />
          <button className="primary" type="submit">סינון</button>
        </form>

        <div className="row" style={{ marginTop: 14, gap: 7 }}>
          <span className="dim">תצוגה:</span>
          <Link href={{ query: { ...searchParams, view: '4' } }}
                className={`nav-link ${view === '4' ? 'active' : ''}`}>4 בשורה</Link>
          <Link href={{ query: { ...searchParams, view: '2' } }}
                className={`nav-link ${view === '2' ? 'active' : ''}`}>2 בשורה</Link>
        </div>
      </div>

      {supps.length === 0 ? (
        <div className="card"><div className="empty">
          <div className="empty-mark">🔍</div>
          <p style={{ marginBottom: 4 }}>לא נמצאו מוצרים</p>
          <p className="dim" style={{ margin: 0 }}>נסי לשנות את הסינון, או בקשי מהמנהל להוסיף מוצר</p>
        </div></div>
      ) : (
        <>
          <div className={`grid ${view === '2' ? 'grid-2' : 'grid-4'}`} style={{ marginBottom: 18 }}>
            {supps.map((s) => (
              <Link key={s.id} href={`/product/${s.id}`} className="product">
                <div className="product-thumb">
                  <div className="product-initials">{initials(s.name)}</div>
                </div>
                <div className="product-body">
                  <div className="product-name">{s.name}</div>
                  <div className="product-brand">{s.brand}</div>
                  {s.category && <div><span className="badge">{s.category}</span></div>}
                  <div className="product-price">{priceLabel(s)}</div>
                </div>
              </Link>
            ))}
          </div>

          {lastPage > 0 && (
            <div className="row between" style={{ marginBottom: 18 }}>
              <div>
                {page > 0 && <Link href={pageLink(page - 1)} className="btn small">← הקודם</Link>}
              </div>
              <span className="dim">עמוד {page + 1} מתוך {lastPage + 1}</span>
              <div>
                {page < lastPage && <Link href={pageLink(page + 1)} className="btn small">הבא →</Link>}
              </div>
            </div>
          )}
        </>
      )}

      <div className="card">
        <div className="card-title"><h3>לא מצאת מוצר?</h3></div>
        <p className="muted">שלחי בקשה למנהל הקטלוג והוא יוסיף אותו למאגר.</p>
        <RequestProductForm />
      </div>
    </div>
  );
}
