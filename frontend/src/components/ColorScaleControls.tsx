import { useEffect, useId, useState } from "react";
import { validColorDomain } from "../lib/earthApi";
import type { EarthColorRange } from "../lib/earthApi";

export function ColorScaleControls({
  domain,
  unit,
  value,
  onChange,
}: {
  domain: [number, number];
  unit: string;
  value?: EarthColorRange;
  onChange: (value?: EarthColorRange) => void;
}) {
  const id = useId();
  const [minimum, setMinimum] = useState(String(value?.domain[0] ?? domain[0]));
  const [maximum, setMaximum] = useState(String(value?.domain[1] ?? domain[1]));
  const [hideOutside, setHideOutside] = useState(value?.hideOutside ?? true);
  const [error, setError] = useState("");
  useEffect(() => {
    setMinimum(String(value?.domain[0] ?? domain[0]));
    setMaximum(String(value?.domain[1] ?? domain[1]));
    setHideOutside(value?.hideOutside ?? true);
    setError("");
  }, [value, domain[0], domain[1]]);
  return (
    <form
      className="color-range-controls"
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
          Minimum ({unit})
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
        </label>
        <label htmlFor={`${id}-maximum`}>
          Maximum ({unit})
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
        </label>
        <button type="submit">Apply range</button>
        <button
          type="button"
          disabled={!value}
          onClick={() => onChange(undefined)}
        >
          Reset scale
        </button>
      </div>
      <label className="color-range-mask">
        <input
          type="checkbox"
          checked={hideOutside}
          onChange={(event) => setHideOutside(event.target.checked)}
        />
        Hide values outside this range
      </label>
      <small id={`${id}-help`}>
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
