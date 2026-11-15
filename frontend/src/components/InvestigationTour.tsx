import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export type TourView = "Anomalies" | "Trend" | "Relationships";

type Step = {
  title: string;
  view?: TourView;
  body: string[];
};

export function tourSteps(hasRelationships: boolean): Step[] {
  return [
    {
      title: "Three ways to read the same data",
      body: [
        "This investigation uses one regional monthly series per indicator. The three tabs answer different questions about it.",
        "Use Next to walk through each tab, or close the tour at any time.",
      ],
    },
    {
      title: "Anomalies — was this month unusual?",
      view: "Anomalies",
      body: [
        "Each month is compared with its usual value for that calendar month, so the seasonal cycle no longer dominates the picture.",
        "Above the zero line means higher than usual for that time of year. The thick 12-month mean shows slower, multi-year shifts.",
      ],
    },
    {
      title: "Trend — is it changing over time?",
      view: "Trend",
      body: [
        "A seasonal linear fit estimates the change per year and per decade, with a 95% interval and adjusted p-values.",
        "Points A and B show how much the fitted line changes over a span. The dashed extension is a straight-line projection, not a forecast.",
      ],
    },
    {
      title: "Relationships — do the indicators move together?",
      view: "Relationships",
      body: hasRelationships
        ? [
            "Correlations are computed after removing seasons and trends, for Y 0–6 months after X.",
            "The result card gives the evidence for the selected lag; the lag curve and scatterplot sit side by side. Association is not causation.",
          ]
        : [
            "This view needs a second indicator (Indicator Y). Choose one in step 2 of the setup and generate the investigation again.",
          ],
    },
    {
      title: "Where the evidence comes from",
      body: [
        "Open Data, coverage & methods at the bottom for products, units, coverage, the statistical method, every lag's correlations and the full test family.",
        "Export JSON or CSV keeps the complete investigation for reproduction.",
      ],
    },
  ];
}

/** Inline step-by-step tour; each step can switch the active results tab. */
export function InvestigationTour({
  step,
  hasRelationships,
  onStep,
  onClose,
}: {
  step: number;
  hasRelationships: boolean;
  onStep: (step: number, view?: TourView) => void;
  onClose: () => void;
}) {
  const steps = tourSteps(hasRelationships);
  const current = steps[step];
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [step]);
  const go = (next: number) => onStep(next, steps[next].view);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      className="investigation-tour"
      role="dialog"
      aria-modal="false"
      aria-label={`Tour step ${step + 1} of ${steps.length}: ${current.title}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowRight" && step < steps.length - 1) go(step + 1);
        if (e.key === "ArrowLeft" && step > 0) go(step - 1);
      }}
    >
      <div className="investigation-tour-head">
        <span className="trend-kicker">
          Tour · {step + 1} / {steps.length}
        </span>
        <button type="button" aria-label="Close tour" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <strong>{current.title}</strong>
      {current.body.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <div className="investigation-tour-nav">
        <div className="investigation-tour-dots" aria-hidden="true">
          {steps.map((s, i) => (
            <i key={s.title} data-active={i === step} />
          ))}
        </div>
        <button
          type="button"
          disabled={step === 0}
          onClick={() => go(step - 1)}
        >
          Back
        </button>
        {step < steps.length - 1 ? (
          <button
            type="button"
            className="investigation-tour-next"
            onClick={() => go(step + 1)}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            className="investigation-tour-next"
            onClick={onClose}
          >
            Finish
          </button>
        )}
      </div>
    </section>
  );
}
