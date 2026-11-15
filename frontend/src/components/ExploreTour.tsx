import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { EarthVariable } from "../lib/earthApi";
import { GuidedTour } from "./GuidedTour";
import type { GuidedStep } from "./GuidedTour";
import "./explore-tour.css";

export type SuggestedVariableRequest = { id: string; nonce: number };
export type ExploreChoice = "area" | "variables" | "period";
const freshChoices = () => ({ area: false, variables: false, period: false });
const preferenceKey = "kipp.explore-tour.v1";
const panel = '[data-panel-id="explore-A"]';

/** The wrapper stays mounted when applying variables replaces the empty panel. */
export function ExploreTour({ ready, active, suggestion, onSuggestion, children }: {
  ready: boolean;
  active: boolean;
  suggestion?: EarthVariable;
  onSuggestion: (id: string) => void;
  children: (onChoice: (choice: ExploreChoice) => void) => ReactNode;
}) {
  const [step, setStep] = useState<number | null>(null);
  const [chosen, setChosen] = useState(freshChoices);
  const [afterTour, setAfterTour] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const suppressed = useRef(false);
  const shieldTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onChoice = useCallback((choice: ExploreChoice) => {
    setChosen(previous => ({ ...previous, [choice]: true }));
  }, []);
  // The parent mounts this view only after catalog/config loading succeeds.
  // Wait for the controls to paint before positioning the first spotlight.
  useEffect(() => {
    if (!active) {
      setStep(null);
      setAfterTour(false);
      clearTimeout(shieldTimer.current);
      return;
    }
    if (suppressed.current) return;
    try {
      const preference = window.localStorage.getItem(preferenceKey);
      if (preference === "completed" || preference === "dismissed") return;
    } catch { /* Storage can be blocked; the tour remains usable. */ }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        setChosen(freshChoices());
        setStep(0);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  useEffect(() => () => clearTimeout(shieldTimer.current), []);
  const close = (preference?: "completed" | "dismissed") => {
    if (preference) {
      suppressed.current = true;
      try { window.localStorage.setItem(preferenceKey, preference); }
      catch { /* Still suppress for this mounted view when storage is blocked. */ }
    }
    setStep(null);
    setAfterTour(true);
    clearTimeout(shieldTimer.current);
    shieldTimer.current = setTimeout(() => setAfterTour(false), 450);
    root.current?.querySelector<HTMLButtonElement>(".multi-variable-trigger")?.focus({ preventScroll: true });
  };
  const confirm = (choice: ExploreChoice, label: string, allowed = true) => ({
    canNext: chosen[choice] && allowed,
    waitHint: choice === "variables" && !ready
      ? "Use the suggestion, or choose variables and press Apply to continue."
      : "Make a choice, or keep the current selection to continue.",
    actions: chosen[choice] && allowed
      ? <span className="guided-tour-done">✓ {label}</span>
      : allowed ? <button type="button" className="guided-tour-secondary"
          onClick={() => onChoice(choice)}>Keep {label.toLowerCase()}</button> : null,
  });
  const steps: GuidedStep[] = [
    {
      id: "explore-welcome", title: "Welcome to Explore",
      target: `${panel} .compact-exploration-controls`,
      body: <p>Choose a place, select Earth variables and explore their monthly data on the globe and chart. You can use the page while this tour is open. You choose what to apply; the tour never loads a variable without your action.</p>,
    },
    {
      followDialog: true,
      id: "explore-area", title: "1 · Choose an area",
      target: `${panel} .compact-exploration-controls > .exploration-picker:not(.exploration-period)`,
      body: <p>Search for a country, or keep the current area. You can also use Draw area on the globe to select a rectangle. Country values use their bounding rectangle, including cells outside the border.</p>,
      ...confirm("area", "Current area"),
    },
    {
      followDialog: true,
      id: "explore-variables", title: "2 · Choose what to explore",
      target: `${panel} .multi-variable-picker`,
      body: <p>Use the suggested variable below, or open Variables to search the full catalog. Select one or more variables and press <strong>Apply</strong>. Checking a box only edits a draft. Unavailable variables cannot be selected.</p>,
      ...confirm("variables", "Selected variables", ready),
      actions: <>
        {suggestion && <button type="button" className="guided-tour-primary"
          onClick={() => onSuggestion(suggestion.id)}>
          Use {suggestion.name}
        </button>}
        {confirm("variables", "Selected variables", ready).actions}
      </>,
    },
    {
      followDialog: true,
      id: "explore-period", title: "3 · Choose the months",
      target: `${panel} .exploration-period`,
      body: <p>Open Study period to choose the first and last months, or keep the available range. Each variable has its own coverage; months without valid data remain gaps.</p>,
      ...confirm("period", "Current period", ready),
    },
    {
      id: "explore-globe", title: "Read the map",
      target: `${panel} .real-globe-container`,
      body: <p>Drag to rotate and zoom to inspect the map. Draw area changes the study rectangle; Clear area returns to Global. Colors show the displayed month in each layer’s units. The background Earth image is decorative, not monthly data.</p>,
    },
    {
      id: "explore-playback", title: "Move through time",
      target: `${panel} .real-time-controls`,
      body: <p>Use Play, the arrows, the timeline or Selected month to move through the study period. Speed controls playback. Data may buffer; read the loading message to check which month is actually displayed. Animation alone does not establish a trend.</p>,
    },
    {
      id: "explore-layers", title: "Adjust map layers",
      target: `${panel} .comparison-map-controls`,
      body: <p>Expand Map filters to configure each variable’s visibility, opacity and color scale. Opacity blends colors, not measurements. These display filters do not recalculate the regional series or statistical evidence.</p>,
    },
    {
      id: "explore-chart", title: "Read the regional chart",
      target: `${panel} .multivariable-analysis`,
      body: <p>The chart uses the selected rectangle and study period. A single variable can use its physical units; multiple variables use Historical deviation or Scale 0–100. These transformations help compare patterns, but matching curves do not establish causality. Global needs a country or drawn area for regional analysis. Loading and source errors remain visible.</p>,
    },
    {
      id: "explore-save", title: "Save and continue investigating",
      target: ".site-header .investigation-controls",
      body: <p>On small screens, open the navigation menu to find Save, Saved and Share. Save keeps this view in your browser. Share copies a link to the filters; it does not freeze the observations. For an investigation of change, open Trend Lab and choose its area, indicators and period separately. Inspect data sources, units, coverage and method before interpreting evidence.</p>,
    },
  ];
  return (
    <div ref={root} className="explore-tour-workspace">
      {children(onChoice)}
      {active && step !== null && <GuidedTour key={ready ? "selected" : "empty"} steps={steps} step={step} onStep={setStep} onClose={() => close()}
        onFinish={() => close("completed")}
        dismissActions={<>
          <button type="button" onClick={() => close()}>Skip</button>
          <button type="button" onClick={() => close("dismissed")}>Don’t show again</button>
        </>} />}
      {active && afterTour && <div className="guided-tour-shield" aria-hidden="true" />}
    </div>
  );
}
