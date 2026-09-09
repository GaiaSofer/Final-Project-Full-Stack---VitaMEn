'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addComment, deleteComment } from '@/app/actions/comments';
import type { Comment } from '@/types/database.types';

export default function CommentSection({ supplementId, comments, currentUserId }:
  { supplementId: string; comments: Comment[]; currentUserId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(null); setBusy(true);
    const res = await addComment(supplementId, body);
    setBusy(false);
    if (!res.error) router.refresh();
    setMsg(res.error ?? null);
    if (!res.error) setBody('');
  }

  return (
    <div>
      {comments.length === 0 ? (
        <p className="muted">עדיין אין תגובות על המוצר הזה.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="item">
            <div className="item-main">
              <div>{c.body}</div>
              <div className="dim">{new Date(c.created_at).toLocaleDateString('he-IL')}</div>
            </div>
            {c.author_id === currentUserId && (
              <button className="ghost small" onClick={() => deleteComment(c.id, supplementId)}>מחיקה</button>
            )}
          </div>
        ))
      )}

      <div className="inline-form" style={{ marginTop: 14 }}>
        <input placeholder="מה דעתך על המוצר?" value={body}
               onChange={(e) => setBody(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button className="primary" onClick={submit} disabled={busy || !body.trim()}>
          {busy ? '…' : 'פרסום'}
        </button>
      </div>
      {msg && <div className="alert alert-danger" style={{ marginTop: 12 }}>
        <span className="alert-icon">⛔</span><span>{msg}</span>
      </div>}
    </div>
  );
}
