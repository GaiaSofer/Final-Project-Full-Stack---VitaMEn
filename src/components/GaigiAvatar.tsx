import Image from 'next/image';
import type { Mood } from '@/lib/gaigi/engine';

// Illustrated avatar with one file per mood. The engine decides the mood, so
// the expression always matches what actually happened.
export default function GaigiAvatar({ mood = 'neutral', size = 44 }: { mood?: Mood; size?: number }) {
  return (
    <Image
      src={`/gaigi/${mood}.png`}
      alt="גאיגי"
      width={size}
      height={size}
      priority={size > 60}
      style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  );
}
