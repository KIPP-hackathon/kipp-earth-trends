import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Info } from "lucide-react";

/** Small ⓘ button; hover, focus or tap reveals what a chart is telling. */
export function ChartInfo({
  label = "How to read this chart",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className="chart-info"
      data-open={open}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        <Info size={14} />
      </button>
      <span role="tooltip" id={id} className="chart-info-content">
        <strong>{label}</strong>
        {children}
      </span>
    </span>
  );
}
