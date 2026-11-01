interface ElevationProfileProps {
  elevations: number[];
  className?: string;
}

export function ElevationProfile({ elevations, className = "" }: ElevationProfileProps) {
  if (elevations.length < 2) return null;

  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const range = max - min || 1;

  const W = 300;
  const H = 70;

  const points = elevations.map((e, i) => {
    const x = (i / (elevations.length - 1)) * W;
    const y = H - ((e - min) / range) * (H - 6);
    return [x, y] as [number, number];
  });

  const linePath =
    points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height: 70 }}
      aria-hidden="true"
    >
      <path d={areaPath} fill="#6B7C6B" fillOpacity="0.18" />
      <path d={linePath} fill="none" stroke="#6B7C6B" strokeWidth="1.5" />
    </svg>
  );
}
