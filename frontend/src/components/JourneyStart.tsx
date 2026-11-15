import { ArrowUpRight, Earth, FlaskConical, MapPinned } from "lucide-react";
import type { LabTab } from "./LabTabs";
import "./journey-start.css";

const steps = [
  {
    tab: "events",
    icon: MapPinned,
    label: "Historical events",
    action: "Explore events",
    text: "Start with a historical Earth event. Explore its region and period, then see how available climate variables changed over time.",
  },
  {
    tab: "trend",
    icon: FlaskConical,
    label: "Trend Lab",
    action: "Investigate a trend",
    text: "Go deeper: choose a variable, region and period. Measure rates of change, assess significance and explore conditional projections from historical data.",
  },
  {
    tab: "explore",
    icon: Earth,
    label: "Explore the data",
    action: "Open the explorer",
    text: "Take the tools into your own investigation. Compare global and selected-area series, try different variables and look for patterns worth testing.",
  },
] as const;

export function JourneyStart({
  onNavigate,
  onAsk,
}: {
  onNavigate: (tab: LabTab) => void;
  onAsk: () => void;
}) {
  return (
    <section className="journey-start" aria-labelledby="journey-title">
      <div className="journey-hero">
        <div>
          <p className="journey-eyebrow">NASA SPACE APPS 2026 · KIPP</p>
          <h2 id="journey-title">
            Be An Earth System <em>Trend Detective!</em>
          </h2>
          <p className="journey-lead">Every change starts with a question.</p>
          <p className="journey-description">
            Investigate historical Earth events and detect trends in climate
            variables. Follow real data from a place and time to a rate of
            change — and the evidence behind it.
          </p>
          <button type="button" className="journey-primary" onClick={onAsk}>
            Explore with KIPP <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="journey-orbit" aria-hidden="true">
          <div className="journey-orbit-ring" />
          <div className="journey-orbit-ring second" />
          <Earth size={172} strokeWidth={0.65} />
          <span className="journey-coordinate">
            ONE PLANET. MANY QUESTIONS.
          </span>
        </div>
      </div>
      <div className="journey-steps">
        {steps.map(({ tab, icon: Icon, label, text, action }, index) => (
          <article key={tab}>
            <div className="journey-step-top">
              <span>0{index + 1}</span>
              <Icon size={23} strokeWidth={1.4} />
            </div>
            <h3>{label}</h3>
            <p>{text}</p>
            <button type="button" onClick={() => onNavigate(tab)}>
              {action}
              <ArrowUpRight size={16} />
            </button>
          </article>
        ))}
      </div>
      <p className="journey-method">
        Variable → region → period → time series → rate of change → significance
        → interpretation
      </p>
      <p className="journey-limits">
        Events are historical starting points, not automatically detected
        impacts. A trend or correlation does not establish a cause. Projections
        are conditional scenarios, not validated forecasts.
      </p>
    </section>
  );
}
