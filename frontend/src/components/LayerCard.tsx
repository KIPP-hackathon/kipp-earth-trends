import { useId } from "react";
import type { ReactNode } from "react";
import { Eye, EyeOff, ScanEye } from "lucide-react";
import type { EarthColorRange, EarthVariable } from "../lib/earthApi";
import { realScale, realUnit } from "../lib/earthApi";
import type { LayerSetting } from "../lib/layers";
import { InlineColorScale } from "./InlineColorScale";
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
          {variable.sourceTable && <p>Source: {variable.sourceTable}</p>}
        </div>
        <div className="layer-heading-actions">
          {onSolo && (
            <button
              type="button"
              className="layer-visibility layer-solo"
              onClick={onSolo}
              aria-label={`Show only ${variable.name} on map`}
              title="Show only this layer"
            >
              <ScanEye size={18} aria-hidden="true" />
            </button>
          )}
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
        {setting.visible && !mapEnabled
          ? "Layer enabled · map data hidden"
          : setting.visible
            ? opacity === 0
              ? "Visible layer · fully transparent"
              : "Shown on map"
            : "Charts only · hidden on map"}
        {loading ? " · loading observations…" : ""}
      </p>
      {status && <p className="layer-status">{status}</p>}
      {wind && (
        <p className="layer-status">
          Wind arrows at {wind.level} use paired U + V (complement loaded
          automatically). Arrows point toward flow; length is fixed. Color and
          charts show this signed component.
        </p>
      )}
      {error && (
        <p className="layer-error" role="alert">
          {error}
        </p>
      )}
      <div className="layer-legend" aria-label={`${variable.name} map scale`}>
        {scale.kind === "continuous" ? (
          <>
            <InlineColorScale
              domain={scale.domain}
              unit={unit}
              gradient={gradient}
              value={colorRange}
              onChange={onColorRange}
            />
            <p className="layer-scale-source">
              {variable.colorRangeSource === "indicator_coverage_p5_p95"
                ? "Default limits: trusted inventory p5–p95 in displayed units; not necessarily this region or period."
                : "Default limits: configured display range; matching percentiles unavailable."}
            </p>
          </>
        ) : (
          <>
            <span
              className="layer-legend-gradient"
              style={{ background: `linear-gradient(90deg,${gradient})` }}
              aria-hidden="true"
            />
            <ul className="layer-category-labels">
              {scale.categories?.map((category) => (
                <li key={category.value}>
                  {category.value} · {category.label}
                </li>
              ))}
            </ul>
            <small>Discrete classes · transparent = no data</small>
          </>
        )}
      </div>
      {children && <div className="layer-analysis-content">{children}</div>}
    </article>
  );
}
