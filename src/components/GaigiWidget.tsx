'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { GaigiReply, Mood } from '@/lib/gaigi/engine';
import { requestProduct } from '@/app/actions/requests';

interface Msg {
  role: 'user' | 'bot';
  text: string;
  mood?: Mood;
  products?: GaigiReply['products'];
  suggestions?: string[];
  requestProduct?: string;
}

const OPENERS = [
  { label: 'חיפוש בקטלוג',        icon: '🔎', query: 'אילו מוצרים מכילים ויטמין D?' },
  { label: 'מוצרים חלופיים',      icon: '💊', query: 'יש חלופה זולה ל-Omega-3?' },
  { label: 'הנחיות משרד הבריאות', icon: '📋', query: 'מה ההמלצה של משרד הבריאות למגנזיום?' },
];

const GREETING: Msg = {
  role: 'bot', mood: 'happy',
  text: 'היי, אני גאיגי ❤️ העוזרת האישית שלך. במה אני יכולה לעזור?',
};

export default function GaigiWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const mood: Mood = busy ? 'thinking'
    : [...messages].reverse().find((m) => m.role === 'bot')?.mood ?? 'neutral';

  async function ask(text: string) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput(''); setBusy(true);
    try {
      const res = await fetch('/api/gaigi', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data: GaigiReply & { error?: string } = await res.json();
      setMessages((m) => [...m, data.error
        ? { role: 'bot', text: data.error, mood: 'sad' }
        : { role: 'bot', text: data.text, mood: data.mood, products: data.products,
            suggestions: data.suggestions, requestProduct: data.requestProduct }]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'שגיאת רשת. נסי שוב.', mood: 'sad' }]);
    } finally { setBusy(false); }
  }

  async function sendRequest(name: string, index: number) {
    setBusy(true);
    const res = await requestProduct(name, 'נשלח דרך הצ׳אט עם גאיגי');
    setBusy(false);
    // consume the offer so the button cannot be pressed twice
    setMessages((m) => m.map((msg, i) => (i === index ? { ...msg, requestProduct: undefined } : msg)));
    setMessages((m) => [...m, 'ok' in res
      ? { role: 'bot', mood: 'happy',
          text: res.message ?? 'תודה שתרמת לקהילה שלנו ❤️ הבקשה נשלחה למנהל.' }
      : { role: 'bot', text: res.error, mood: 'sad' }]);
  }

  return (
    <>
      {open && (
        <div className="gaigi-panel" role="dialog" aria-label="צ׳אט עם גאיגי">
          <div className="gaigi-head">
            <Image src={`/gaigi/${mood}.png`} alt="גאיגי" width={40} height={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 640, fontSize: 14.5 }}>גאיגי</div>
              <div className="dim">עונה מהקטלוג · המלצה ולא ייעוץ רפואי</div>
            </div>
            <button className="gaigi-close" onClick={() => setOpen(false)} aria-label="סגירה">✕</button>
          </div>

          <div className="gaigi-body">
            <div className="chat-log" style={{ maxHeight: 'none' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column',
                                      alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 6 }}>
                  <div className={`bubble ${m.role === 'user' ? 'user' : 'bot'}`}
                       style={{ maxWidth: '90%', fontSize: 13.5 }}>{m.text}</div>

                  {m.products && m.products.length > 0 && (
                    <div style={{ display: 'grid', gap: 6, width: '100%' }}>
                      {m.products.map((p) => (
                        <Link key={p.id} href={`/product/${p.id}`} className="panel"
                              style={{ display: 'flex', justifyContent: 'space-between', gap: 10,
                                       alignItems: 'center', color: 'inherit', padding: '9px 11px', fontSize: 13 }}>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ fontWeight: 570 }}>{p.name}</span>
                            <span className="dim"> · {p.brand}</span>
                            {p.note && <span className="dim"> · {p.note}</span>}
                          </span>
                          <span style={{ fontWeight: 620, whiteSpace: 'nowrap' }}>
                            ₪{(p.priceCents / 100).toFixed(0)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.requestProduct && (
                    <button className="primary small" disabled={busy}
                            onClick={() => sendRequest(m.requestProduct!, i)}
                            style={{ fontSize: 12.5 }}>
                      שלחי בקשה למנהל
                    </button>
                  )}

                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="row wrap" style={{ gap: 5 }}>
                      {m.suggestions.map((s) => (
                        <button key={s} className="small" onClick={() => ask(s)} disabled={busy}
                                style={{ fontSize: 12 }}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="bubble bot dim" style={{ fontSize: 13 }}>גאיגי בודקת בקטלוג…</div>}
            </div>

            {messages.length === 1 && (
              <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                {OPENERS.map((o) => (
                  <button key={o.label} onClick={() => ask(o.query)} disabled={busy}
                          style={{ display: 'flex', justifyContent: 'space-between',
                                   alignItems: 'center', fontSize: 13.5 }}>
                    <span>{o.label}</span><span aria-hidden="true">{o.icon}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="gaigi-foot">
            <div className="row" style={{ gap: 7 }}>
              <input value={input} onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && ask(input)}
                     placeholder="כתבי לגאיגי…" style={{ flex: 1, fontSize: 13.5 }} />
              <button className="primary small" onClick={() => ask(input)} disabled={busy || !input.trim()}>
                שליחה
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="gaigi-fab" onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'סגירת הצ׳אט' : 'פתיחת צ׳אט עם גאיגי'}>
        <Image src={`/gaigi/${open ? mood : 'neutral'}.png`} alt="" width={58} height={58} />
      </button>
    </>
  );
}
