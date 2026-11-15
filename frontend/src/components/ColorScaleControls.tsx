import { useEffect, useId, useState } from "react";
import { validColorDomain } from "../lib/earthApi";
import type { EarthColorRange } from "../lib/earthApi";

export function ColorScaleControls({
  domain,
  unit,
  value,
  onChange,
  colors,
}: {
  domain: [number, number];
  colors?: string[];
  unit: string;
  value?: EarthColorRange;
  onChange: (value?: EarthColorRange) => void;
}) {
  const id = useId();
  const appliedMinimum = value?.domain[0] ?? domain[0];
  const appliedMaximum = value?.domain[1] ?? domain[1];
  const [minimum, setMinimum] = useState(appliedMinimum.toFixed(2));
  const [maximum, setMaximum] = useState(appliedMaximum.toFixed(2));
  const [hideOutside, setHideOutside] = useState(value?.hideOutside ?? !colors);
  const [error, setError] = useState("");
  useEffect(() => {
    setMinimum(appliedMinimum.toFixed(2));
    setMaximum(appliedMaximum.toFixed(2));
    setError("");
  }, [appliedMinimum, appliedMaximum]);
  useEffect(() => setHideOutside(value?.hideOutside ?? !colors), [value?.hideOutside, !!colors]);
  return (
    <form
      className={`color-range-controls${colors ? " inline-color-range" : ""}`}
      aria-label="Map color range"
      onSubmit={(event) => {
        event.preventDefault();
        const next: [number, number] = [Number(minimum), Number(maximum)];
        if (!minimum.trim() || !maximum.trim() || !validColorDomain(next)) {
          setError("Enter finite limits with minimum lower than maximum.");
          return;
        }
        setError("");
        onChange({ domain: next, hideOutside });
      }}
    >
      <div className="color-range-fields">
        <label htmlFor={`${id}-minimum`}>
          <span className={colors ? "sr-only" : undefined}>Minimum ({unit})</span>
          <input
            id={`${id}-minimum`}
            type="number"
            step="any"
            required
            value={minimum}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : `${id}-help`}
            onChange={(event) => {
              setMinimum(event.target.value);
              setError("");
            }}
          />
          {colors && <span aria-hidden="true">{unit}</span>}
        </label>
        <label htmlFor={`${id}-maximum`}>
          <span className={colors ? "sr-only" : undefined}>Maximum ({unit})</span>
          <input
            id={`${id}-maximum`}
            type="number"
            step="any"
            required
            value={maximum}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : `${id}-help`}
            onChange={(event) => {
              setMaximum(event.target.value);
              setError("");
            }}
          />
          {colors && <span aria-hidden="true">{unit}</span>}
        </label>
        {colors && <span className="layer-legend-gradient" style={{ background: `linear-gradient(90deg,${colors.join(",")})` }} aria-hidden="true" />}
        <button type="submit">{colors ? "Apply" : "Apply range"}</button>
        <button
          type="button"
          onClick={() => {
            setMinimum(domain[0].toFixed(2));
            setMaximum(domain[1].toFixed(2));
            setHideOutside(!colors);
            setError("");
            onChange(undefined);
          }}
        >
          {colors ? "Reset" : "Reset scale"}
        </button>
      </div>
      {!colors && <label className="color-range-mask">
        <input
          type="checkbox"
          checked={hideOutside}
          onChange={(event) => setHideOutside(event.target.checked)}
        />
        {colors ? "Hide outside range" : "Hide values outside this range"}
      </label>}
      <small id={`${id}-help`} className={colors ? "sr-only" : undefined}>
        Display only. Original values, series and exports stay unchanged. Shared
        by globes showing the same variable.
      </small>
      {error && (
        <p id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
