// Flowered "VitaMEn" title: green name with a pink flower on each side.
// Used large on the landing hero and compact in the nav on every page, so the
// flowered brand identity — not just the small icon — is always visible.
// The flex `gap` is applied identically on both sides, so the flower-to-text
// distance is always equal by construction, not by eyeballed margins.
function Flower({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <g transform="translate(12,12)">
        <circle cx="0"    cy="-6"   r="4.6" fill="#f4a9bf" />
        <circle cx="5.7"  cy="-1.9" r="4.6" fill="#f4a9bf" />
        <circle cx="3.5"  cy="4.9"  r="4.6" fill="#f4a9bf" />
        <circle cx="-3.5" cy="4.9"  r="4.6" fill="#f4a9bf" />
        <circle cx="-5.7" cy="-1.9" r="4.6" fill="#f4a9bf" />
        <circle cx="0"    cy="0"    r="3"   fill="#fbe3a6" />
      </g>
    </svg>
  );
}

export default function BrandTitle({ fontSize = 40, flowerSize = 28, gap = 12 }: {
  fontSize?: number; flowerSize?: number; gap?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap }}>
      <Flower size={flowerSize} />
      <span style={{
        fontSize, fontWeight: 800, letterSpacing: '-.02em',
        color: '#5aa17f', lineHeight: 1, whiteSpace: 'nowrap',
      }}>VitaMEn</span>
      <Flower size={flowerSize} />
    </div>
  );
}
