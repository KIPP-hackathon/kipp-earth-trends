import { useEffect, useId, useRef, useState } from "react";
import type { EarthColorRange } from "../lib/earthApi";
import { colorRangeDraft } from "../lib/colorRangeDraft";

export function InlineColorScale({
  domain,
  unit,
  gradient,
  value,
  onChange,
}: {
  domain: [number, number];
  unit: string;
  gradient: string;
  value?: EarthColorRange;
  onChange: (value?: EarthColorRange) => void;
}) {
  const id = useId();
  const [minimum, setMinimum] = useState(String(value?.domain[0] ?? domain[0]));
  const [maximum, setMaximum] = useState(String(value?.domain[1] ?? domain[1]));
  const [error, setError] = useState("");
  const reverting = useRef(false);
  const resetDraft = () => {
    setMinimum(String(value?.domain[0] ?? domain[0]));
    setMaximum(String(value?.domain[1] ?? domain[1]));
    setError("");
  };
  useEffect(resetDraft, [
    value?.domain[0],
    value?.domain[1],
    domain[0],
    domain[1],
  ]);
  const commit = () => {
    if (reverting.current) {
      reverting.current = false;
      return;
    }
    const next = colorRangeDraft(minimum, maximum, value?.hideOutside ?? false);
    if (!next) {
      setError("Enter finite limits with minimum lower than maximum.");
      return;
    }
    setError("");
    const applied = value?.domain ?? domain;
    if (next.domain[0] !== applied[0] || next.domain[1] !== applied[1])
      onChange(next);
  };
  return (
    <div className="inline-color-scale">
      <div className="inline-scale-endpoints">
        {(["minimum", "maximum"] as const).map((endpoint) => (
          <label key={endpoint}>
            <span className="sr-only">
              {endpoint === "minimum" ? "Minimum" : "Maximum"} map color limit (
              {unit})
            </span>
            <input
              type="number"
              step="any"
              value={endpoint === "minimum" ? minimum : maximum}
              aria-invalid={!!error}
              aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => {
                (endpoint === "minimum" ? setMinimum : setMaximum)(
                  event.target.value,
                );
                setError("");
              }}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  reverting.current = true;
                  resetDraft();
                  event.currentTarget.blur();
                }
              }}
            />
            <span>{unit}</span>
          </label>
        ))}
      </div>
      <span
        className="layer-legend-gradient"
        style={{ background: `linear-gradient(90deg,${gradient})` }}
        aria-hidden="true"
      />
      <div className="inline-scale-options">
        <label>
          <input
            type="checkbox"
            checked={value?.hideOutside ?? false}
            onChange={(event) => {
              const next = colorRangeDraft(
                minimum,
                maximum,
                event.target.checked,
              );
              if (!next) {
                setError("Enter valid limits before changing masking.");
                return;
              }
              setError("");
              onChange(next);
            }}
          />{" "}
          Hide outside range
        </label>
        <button
          type="button"
          disabled={!value}
          onClick={() => {
            resetDraft();
            onChange(undefined);
          }}
        >
          Reset scale
        </button>
      </div>
      <small id={`${id}-help`}>
        Edit a limit, then leave the field to update the map. Display only; data
        and chart values stay unchanged. Transparent = no data
        {value?.hideOutside ? " or outside range" : ""}.
      </small>
      {error && (
        <p id={`${id}-error`} className="layer-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
