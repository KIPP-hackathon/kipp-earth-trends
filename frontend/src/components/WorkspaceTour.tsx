import { useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";
import { GuidedTour } from "./GuidedTour";
import type { GuidedStep } from "./GuidedTour";
import "./workspace-tour.css";

const compareSteps: GuidedStep[] = [
  {
    id: "compare-start",
    title: "Two views, one investigation",
    target: "#panel-compare .real-panels",
    body: (
      <p>
        Compare two regions, periods or sets of variables. A and B keep
        independent filters while sharing the globe camera. This tour explains
        the controls without changing your selections.
      </p>
    ),
  },
  {
    id: "compare-a",
    title: "1 · Set up panel A",
    target: '[data-panel-id="compare-A"] .compact-exploration-controls',
    followDialog: true,
    body: (
      <p>
        Choose Study context, Variables and Study period. Countries and places
        set a rectangle; an event applies an editable historical preset to both
        panels. Select variables and press Apply. Availability depends on the
        catalog and regional coverage.
      </p>
    ),
  },
  {
    id: "compare-b",
    title: "2 · Choose the comparison",
    target: '[data-panel-id="compare-B"] .compact-exploration-controls',
    followDialog: true,
    body: (
      <p>
        Set B independently to compare another place or period. Copy A → B
        copies filters and layers when A is ready; then change just what you
        want to investigate in B. Country areas are bounding rectangles, not
        political borders.
      </p>
    ),
  },
  {
    id: "compare-play",
    title: "3 · Play both views",
    target: "#panel-compare .compare-playback",
    body: (
      <p>
        Play both advances the two maps with one speed. Same month uses dates
        available in both panels; leave it off to follow each study period
        independently. Both panels need data and at least two months. Read A/B
        dates and buffering messages to know what is displayed.
      </p>
    ),
  },
  {
    id: "compare-camera",
    title: "4 · Inspect maps and series",
    target: "#panel-compare .real-panels",
    body: (
      <p>
        Rotate either globe to move both cameras. Map filters and individual
        playback stay independent. Matching variables share color ranges;
        different products and units need separate interpretation. Changing map
        colors or opacity does not recalculate the series.
      </p>
    ),
  },
  {
    id: "compare-evidence",
    title: "5 · Follow the evidence",
    target: "#panel-compare .real-method-note",
    body: (
      <p>
        Read each regional series, units, coverage, rates and significance when
        available. Similar colors or curves do not prove causality. Use Trend
        Lab for a focused investigation, or Save and Share from the navigation
        menu to revisit these filters.
      </p>
    ),
  },
];
const catalogSteps: GuidedStep[] = [
  {
    id: "catalog-start",
    title: "Meet the Earth system field guide",
    target: "#panel-catalog .vc-heading",
    body: (
      <p>
        Discover what a variable measures, why it matters and where it can help
        you investigate. This guide connects explanations to the live catalog;
        it does not create observations or scientific findings.
      </p>
    ),
  },
  {
    id: "catalog-places",
    title: "1 · Start with a place",
    target: "#vc-ecosystem-gallery",
    body: (
      <p>
        Choose an ecosystem to see its role, processes, relevant variables and
        study rectangle. Tags explain reviewed relationships; other important
        measurements are marked Not linked. View area in Explore opens the
        region even before you choose a variable.
      </p>
    ),
  },
  {
    id: "catalog-find",
    title: "2 · Find your variables",
    target: "#panel-catalog .vc-toolbar",
    body: (
      <p>
        Search by name or topic and filter to available data. Field guide shows
        curated explanations; Full catalog includes technical and unavailable
        fields. Choosing an ecosystem also filters the results; clear it to
        browse other places.
      </p>
    ),
  },
  {
    id: "catalog-notes",
    title: "3 · Read the field notes",
    target: "#panel-catalog .vc-browser-heading",
    body: (
      <p>
        Open Field notes on a variable card to read its definition, units,
        sources, related signals and limitations. Reanalysis, satellite
        estimates and simulation have different meanings. A relationship in the
        guide is context, not proof of causality.
      </p>
    ),
  },
  {
    id: "catalog-build",
    title: "4 · Connect the variables",
    target: "#panel-catalog .vc-investigation",
    body: (
      <p>
        Add up to six available variables to your investigation. Review the
        study area and common catalog months. A combination is a study
        selection, not a new validated scientific indicator. Regional coverage
        is checked when the data loads.
      </p>
    ),
  },
  {
    id: "catalog-explore",
    title: "5 · Open your investigation",
    target: "#panel-catalog .vc-open-investigation",
    body: (
      <p>
        Open in Explore applies your variables, area and shared period. The
        button stays disabled when no valid combination exists. Continue with
        the time series, rate of change and statistical evidence; inspect
        provenance and limitations before interpreting a pattern.
      </p>
    ),
  },
];

export function WorkspaceTour({
  workspace,
  active,
  onStart,
}: {
  workspace: "compare" | "catalog";
  active: boolean;
  onStart?: () => void;
}) {
  const [step, setStep] = useState<number | null>(null);
  const [shield, setShield] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!active) {
      setStep(null);
      setShield(false);
      clearTimeout(timer.current);
    }
  }, [active]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const close = () => {
    setStep(null);
    setShield(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShield(false), 450);
    trigger.current?.focus({ preventScroll: true });
  };
  return (
    <div className="workspace-tour-launcher">
      <button
        ref={trigger}
        type="button"
        className="workspace-tour-start"
        aria-expanded={active && step !== null}
        onClick={() => {
          onStart?.();
          setStep(0);
        }}
      >
        <Compass size={15} /> Take the guided tour
      </button>
      {active && step !== null && (
        <GuidedTour
          steps={workspace === "compare" ? compareSteps : catalogSteps}
          step={step}
          onStep={setStep}
          onClose={close}
          onFinish={close}
        />
      )}
      {active && shield && (
        <div className="guided-tour-shield" aria-hidden="true" />
      )}
    </div>
  );
}
