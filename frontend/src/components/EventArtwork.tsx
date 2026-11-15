import { useId } from "react";
import { Compass, Flame, Waves, Wind } from "lucide-react";

export const eventThemes = {
  fire: { label: "Wildfires", icon: Flame },
  enso: { label: "El Niño", icon: Waves },
  storm: { label: "Hurricanes", icon: Wind },
  wave: { label: "Tsunamis", icon: Waves },
  other: { label: "Earth events", icon: Compass },
};
export type EventTheme = keyof typeof eventThemes;
export function eventTheme(category: string): EventTheme {
  const value = category.toLowerCase();
  if (/queimada|wildfire|fire/.test(value)) return "fire";
  if (/niño|nino|enso/.test(value)) return "enso";
  if (/furac|hurricane|cyclone/.test(value)) return "storm";
  if (/tsunami/.test(value)) return "wave";
  return "other";
}

// Decorative vector scenes, never satellite imagery or measured event footprints.
export function EventArtwork({ theme }: { theme: EventTheme }) {
  const id = useId();
  return (
    <svg
      className="event-artwork"
      viewBox="0 0 640 200"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="currentColor" stopOpacity=".35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-land`} x2="0" y2="1">
          <stop stopColor="currentColor" stopOpacity=".22" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".03" />
        </linearGradient>
      </defs>
      <ellipse cx="454" cy="105" rx="235" ry="172" fill={`url(#${id}-glow)`} />
      <g stroke="currentColor" strokeOpacity=".09">
        {[40, 80, 120, 160].map((y) => (
          <path key={y} d={`M0 ${y}H640`} />
        ))}
        {[80, 160, 240, 320, 400, 480, 560].map((x) => (
          <path key={x} d={`M${x} 0V200`} />
        ))}
      </g>
      {theme === "fire" ? (
        <>
          <circle cx="493" cy="74" r="38" fill="currentColor" opacity=".13" />
          <path
            d="M0 165 98 134 173 155 282 121 367 150 464 114 556 144 640 124V200H0Z"
            fill={`url(#${id}-land)`}
          />
          <g
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity=".5"
          >
            {[282, 322, 368, 537, 582].map((x, i) => (
              <path
                key={x}
                d={`M${x} 173v-49m-16 27 16-33 16 33Zm-7 13-9-19-9 19`}
                transform={`translate(0 ${(i % 2) * -12})`}
              />
            ))}
          </g>
          <path
            d="M447 164c-40-7-45-34-28-57 0 16 8 19 12 20-4-29 20-44 18-66 30 22 19 42 31 48 4-5 7-10 7-18 24 31 18 69-20 75"
            fill="currentColor"
            opacity=".25"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M451 164c-20-9-17-24-5-37-1 10 3 13 7 15 0-13 9-20 10-31 18 24 21 42-4 53"
            fill="currentColor"
            opacity=".6"
          />
          <g fill="currentColor" opacity=".6">
            <circle cx="415" cy="80" r="2" />
            <circle cx="478" cy="49" r="2" />
            <circle cx="500" cy="114" r="1.5" />
          </g>
        </>
      ) : theme === "storm" ? (
        <g transform="translate(453 106) rotate(-18)" stroke="currentColor">
          <ellipse rx="96" ry="59" strokeOpacity=".2" strokeDasharray="4 7" />
          <ellipse rx="135" ry="83" strokeOpacity=".13" />
          <path
            d="M-108 35C-128-29-47-87 18-56 87-23 30 43-9 13-44-14 11-42 42-10 78 28 26 86-42 60"
            strokeWidth="23"
            strokeOpacity=".17"
            strokeLinecap="round"
          />
          <path
            d="M-108 35C-128-29-47-87 18-56 87-23 30 43-9 13-44-14 11-42 42-10 78 28 26 86-42 60"
            strokeWidth="2"
            strokeOpacity=".8"
            strokeLinecap="round"
          />
          <circle
            r="9"
            fill="currentColor"
            fillOpacity=".3"
            strokeOpacity=".8"
          />
        </g>
      ) : (
        <>
          {theme === "enso" && (
            <>
              <circle
                cx="468"
                cy="87"
                r="46"
                fill="currentColor"
                opacity=".1"
              />
              <circle
                cx="468"
                cy="87"
                r="33"
                stroke="currentColor"
                strokeOpacity=".35"
              />
            </>
          )}
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={
                theme === "wave"
                  ? `M180 ${155 + i * 14}c95 0 119-15 155-69 36-54 111-54 128-14-40-21-70 16-35 37 43 26 131 23 222 13`
                  : `M180 ${97 + i * 20}c62-45 115 45 176 0s115 45 176 0 87-19 130 0`
              }
              stroke="currentColor"
              strokeWidth={i === 0 ? 2 : 1}
              strokeOpacity={0.65 - i * 0.1}
            />
          ))}
        </>
      )}
      <path
        d="M24 176h20m-10-10v20M600 24h16m-8-8v16"
        stroke="currentColor"
        strokeOpacity=".3"
      />
    </svg>
  );
}
