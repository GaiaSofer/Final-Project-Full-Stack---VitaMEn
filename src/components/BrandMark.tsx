// VitaMEn brand mark: green V, small pink flower in the gap, green ME.
// Drawn directly in the viewBox (no nested scaling) so nothing clips.
// The V sits left and ME sits right, leaving air around the central flower.
export default function BrandMark({ size = 60, showTile = false }: { size?: number; showTile?: boolean }) {
  // viewBox is 112x100 (wider than tall) — render as a rectangle at that same
  // ratio, not a square, or the V/flower/ME get squeezed horizontally.
  const width = size * (112 / 100);
  return (
    <svg viewBox="0 0 112 100" width={width} height={size}
         xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VitaMEn">
      <defs>
        <linearGradient id="vmTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdeef2" />
          <stop offset="0.55" stopColor="#fbe7ee" />
          <stop offset="1" stopColor="#eef7f1" />
        </linearGradient>
      </defs>
      {showTile && <rect x="4" y="4" width="104" height="92" rx="24" fill="url(#vmTile)" />}

      {/* V — pulled left */}
      <path d="M 12 34 L 26 64 L 40 34" fill="none" stroke="#7cc39a"
            strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />

      {/* small flower, centred in the gap */}
      <g transform="translate(56,48)">
        <circle cx="0"    cy="-5.7" r="4.3" fill="#f4a9bf" />
        <circle cx="5.3"  cy="-1.8" r="4.3" fill="#f4a9bf" />
        <circle cx="3.3"  cy="4.6"  r="4.3" fill="#f4a9bf" />
        <circle cx="-3.3" cy="4.6"  r="4.3" fill="#f4a9bf" />
        <circle cx="-5.3" cy="-1.8" r="4.3" fill="#f4a9bf" />
        <circle cx="0"    cy="0"    r="2.8" fill="#fbe3a6" />
      </g>

      {/* ME — pushed right */}
      <text x="72" y="60" fontFamily="ui-sans-serif, system-ui" fontSize="27"
            fontWeight="800" fill="#7cc39a">ME</text>
    </svg>
  );
}
