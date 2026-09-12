'use client';
import { useState } from 'react';

export default function PasswordInput({
  name,
  autoComplete,
  minLength,
  required = true,
}: {
  name: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        name={name}
        type={visible ? 'text' : 'password'}
        dir="ltr"
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'הסתר סיסמה' : 'הצג סיסמה'}
        tabIndex={-1}
        style={{
          position: 'absolute',
          right: 8,
          top: 0,
          bottom: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: 4,
        }}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
