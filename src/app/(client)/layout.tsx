import type { ReactNode } from 'react';
import GaigiWidget from '@/components/GaigiWidget';

// Client-area layout: mounts the floating Gaigi widget on every client page,
// so the assistant is reachable without leaving the current screen.
export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <GaigiWidget />
    </>
  );
}
