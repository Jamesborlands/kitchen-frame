export function PaperGrain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.05] mix-blend-multiply"
    >
      <svg className="h-full w-full">
        <filter id="paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-grain)" />
      </svg>
    </div>
  );
}
