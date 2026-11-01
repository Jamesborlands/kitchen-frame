import type { WatercolorKey } from "@/lib/weather/codes";

const glyphs: Record<WatercolorKey, React.ReactNode> = {
  clear: (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="17.66" y2="6.34" />
      <line x1="6.34" y1="17.66" x2="4.93" y2="19.07" />
    </>
  ),
  cloud: (
    <>
      <line x1="16" y1="6" x2="17" y2="5" />
      <line x1="18.5" y1="5.5" x2="19.07" y2="4.93" />
      <circle cx="15" cy="8" r="3" />
      <path d="M9 17h10a4 4 0 0 0 0-8h-1a5 5 0 0 0-9.9 1H8a3 3 0 0 0 1 5.83" />
    </>
  ),
  overcast: (
    <>
      <path d="M17 17H7a5 5 0 1 1 4.9-6H17a3 3 0 0 1 0 6Z" />
    </>
  ),
  fog: (
    <>
      <path d="M17 12H7a5 5 0 1 1 4.9-6H17a3 3 0 0 1 0 6Z" />
      <line x1="5" y1="15" x2="19" y2="15" />
      <line x1="7" y1="18" x2="17" y2="18" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </>
  ),
  rain: (
    <>
      <path d="M17 12H7a5 5 0 1 1 4.9-6H17a3 3 0 0 1 0 6Z" />
      <line x1="8" y1="15" x2="6" y2="19" />
      <line x1="12" y1="15" x2="10" y2="19" />
      <line x1="16" y1="15" x2="14" y2="19" />
    </>
  ),
  snow: (
    <>
      <path d="M17 12H7a5 5 0 1 1 4.9-6H17a3 3 0 0 1 0 6Z" />
      <circle cx="8" cy="17" r="1" />
      <circle cx="12" cy="19" r="1" />
      <circle cx="16" cy="17" r="1" />
    </>
  ),
  storm: (
    <>
      <path d="M17 12H7a5 5 0 1 1 4.9-6H17a3 3 0 0 1 0 6Z" />
      <polyline points="13 14 10 19 13 19 10 24" />
    </>
  ),
  golden: (
    <>
      <path d="M3 18 Q12 10 21 18" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <path d="M12 17 A4 4 0 0 1 8 17" />
      <line x1="12" y1="10" x2="12" y2="8" />
      <line x1="7.76" y1="11.76" x2="6.34" y2="10.34" />
      <line x1="16.24" y1="11.76" x2="17.66" y2="10.34" />
    </>
  ),
  sunrise: (
    <>
      <line x1="3" y1="18" x2="21" y2="18" />
      <path d="M8.5 18 a3.5 3.5 0 0 1 7 0" />
      <line x1="12" y1="10" x2="12" y2="6.5" />
      <polyline points="9.5 9 12 6.5 14.5 9" />
    </>
  ),
  sunset: (
    <>
      <line x1="3" y1="18" x2="21" y2="18" />
      <path d="M8.5 18 a3.5 3.5 0 0 1 7 0" />
      <line x1="12" y1="6.5" x2="12" y2="10" />
      <polyline points="9.5 7.5 12 10 14.5 7.5" />
    </>
  ),
  twilight: (
    <>
      <path d="M20 13.5A7 7 0 1 1 12.5 6 5.5 5.5 0 0 0 20 13.5z" />
      <circle cx="7" cy="8" r="0.5" />
    </>
  ),
  night: (
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  ),
};

export function WeatherIcon({
  sky,
  className,
  title,
}: {
  sky: WatercolorKey;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      stroke="currentColor"
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {title && <title>{title}</title>}
      {glyphs[sky]}
    </svg>
  );
}
