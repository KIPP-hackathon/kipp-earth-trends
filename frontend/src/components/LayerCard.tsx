import { useId } from "react";
import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { EarthColorRange, EarthVariable } from "../lib/earthApi";
import { realScale, realUnit, validColorDomain } from "../lib/earthApi";
import type { LayerSetting } from "../lib/layers";
import { ColorScaleControls } from "./ColorScaleControls";
import { windComponents } from "../lib/wind";
import "./multivariable-layers.css";

export function LayerCard({
  variable,
  setting,
  colorRange,
  onChange,
  onColorRange,
  onSolo,
  mapEnabled = true,
  loading = false,
  error,
  status,
  children,
}: {
  variable: EarthVariable;
  setting: LayerSetting;
  colorRange?: EarthColorRange;
  onChange: (setting: LayerSetting) => void;
  onColorRange: (value?: EarthColorRange) => void;
  onSolo?: () => void;
  mapEnabled?: boolean;
  loading?: boolean;
  error?: string;
  status?: string;
  children?: ReactNode;
}) {
  const id = useId();
  const scale = realScale(variable);
  const domain =
    scale.kind === "continuous" &&
    colorRange &&
    validColorDomain(colorRange.domain)
      ? colorRange.domain
      : scale.domain;
  const unit = realUnit(variable.unit);
  const wind = windComponents(variable.id);
  const opacity = Number.isFinite(setting.opacity)
    ? Math.max(0, Math.min(1, setting.opacity))
    : 1;
  const percentage = Math.round(opacity * 100);
  const gradient =
    scale.kind === "categorical"
      ? scale.colors
          .map(
            (color, index) =>
              `${color} ${(index * 100) / scale.colors.length}%, ${color} ${((index + 1) * 100) / scale.colors.length}%`,
          )
          .join(",")
      : scale.colors.join(",");
  return (
    <article
      className={`layer-card${setting.visible ? " is-visible" : " is-chart-only"}`}
      aria-labelledby={`${id}-title`}
      aria-busy={loading}
    >
      <div className="layer-card-heading">
        <div>
          <h3 id={`${id}-title`}>{variable.name}</h3>
          <p>
            {variable.product}
            {variable.run ? ` · ${variable.run}` : ""} · {unit}
          </p>
        </div>
        <button
          type="button"
          className="layer-visibility"
          aria-label={`${setting.visible ? "Hide" : "Show"} ${variable.name} on map`}
          aria-pressed={setting.visible}
          title={
            setting.visible
              ? "Hide map layer; keep charts"
              : "Show this layer on the map"
          }
          onClick={() => onChange({ ...setting, visible: !setting.visible })}
        >
          {setting.visible ? (
            <Eye size={19} aria-hidden="true" />
          ) : (
            <EyeOff size={19} aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="layer-opacity">
        <label htmlFor={`${id}-opacity`}>Map opacity</label>
        <input
          id={`${id}-opacity`}
          type="range"
          min={0}
          max={100}
          step={1}
          value={percentage}
          aria-valuetext={`${percentage} percent`}
          onChange={(event) =>
            onChange({
              ...setting,
              opacity:
                Math.max(0, Math.min(100, Number(event.target.value))) / 100,
            })
          }
        />
        <output htmlFor={`${id}-opacity`}>{percentage}%</output>
      </div>
      <p className="layer-map-state">
        {setting.visible && !mapEnabled ? "Layer enabled · map data hidden" : setting.visible
          ? opacity === 0
            ? "Visible layer · fully transparent"
            : "Shown on map"
          : "Charts only · hidden on map"}
        {loading ? " · loading observations…" : ""}
      </p>
      {onSolo && <button type="button" className="layer-solo" onClick={onSolo}>
        Show only this layer
      </button>}
      {status && <p className="layer-status">{status}</p>}
      {wind && <p className="layer-status">
        Wind arrows at {wind.level} use paired U + V (complement loaded automatically).
        {" "}Arrows point toward flow; length is fixed. Color and charts show this signed component.
      </p>}
      {error && (
        <p className="layer-error" role="alert">
          {error}
        </p>
      )}
      <div className="layer-legend" aria-label={`${variable.name} map scale`}>
        <div>
          <span>
            {domain[0]} {unit}
          </span>
          <span>
            {domain[1]} {unit}
          </span>
        </div>
        <span
          className="layer-legend-gradient"
          style={{ background: `linear-gradient(90deg,${gradient})` }}
          aria-hidden="true"
        />
        {scale.kind === "categorical" && scale.categories ? (
          <ul className="layer-category-labels">
            {scale.categories.map((category) => (
              <li key={category.value}>
                {category.value} · {category.label}
              </li>
            ))}
          </ul>
        ) : (
          <small>
            {colorRange?.hideOutside
              ? "Outside values hidden"
              : "Colors saturate at scale limits"}{" "}
            · transparent = no data
            {colorRange?.hideOutside ? " or outside range" : ""}
          </small>
        )}
      </div>
      {scale.kind === "continuous" && (
        <details className="layer-range-controls">
          <summary>Color range · {colorRange ? "custom" : "default"}</summary>
          <ColorScaleControls
            domain={scale.domain}
            unit={unit}
            value={colorRange}
            onChange={onColorRange}
          />
        </details>
      )}
      {children && <div className="layer-analysis-content">{children}</div>}
    </article>
  );
}
