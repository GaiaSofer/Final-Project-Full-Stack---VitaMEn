'use client';
import { removeFromStack } from '@/app/actions/intake';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RemoveButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const res = await removeFromStack(itemId);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    router.refresh();
  }

  return (
    <div>
      <button className="ghost small" disabled={busy} onClick={handleClick}>
        {busy ? '…' : 'הסרה'}
      </button>
      {error && (
        <div className="dim" style={{ color: 'var(--danger)', marginTop: 4, fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
