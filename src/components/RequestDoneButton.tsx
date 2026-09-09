'use client';
import { markRequestDone } from '@/app/actions/requests';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestDoneButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const res = await markRequestDone(id);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    router.refresh();
  }

  return (
    <div>
      <button className="small" disabled={busy} onClick={handleClick}>
        {busy ? '…' : 'סומן כטופל'}
      </button>
      {error && (
        <div className="dim" style={{ color: 'var(--danger)', marginTop: 4, fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
