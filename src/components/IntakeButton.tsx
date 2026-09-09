'use client';
import { logIntake } from '@/app/actions/intake';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function IntakeButton({ supplementId }: { supplementId: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const res = await logIntake(supplementId);
    setBusy(false);
    if (res.error) {
      // A transient server/network hiccup returns a friendly message instead
      // of crashing the page — show it and let the person simply try again.
      setError(res.error);
      return;
    }
    router.refresh();
    setDone(true);
  }

  return (
    <div>
      <button
        className={done ? '' : 'primary'}
        disabled={done || busy}
        onClick={handleClick}
      >
        {done ? '✓ נלקח' : busy ? '…' : 'סמן כנלקח'}
      </button>
      {error && (
        <div className="dim" style={{ color: 'var(--danger)', marginTop: 4, fontSize: 12.5 }}>
          {error}
        </div>
      )}
    </div>
  );
}
