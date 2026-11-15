import type { GuidedStep } from "./GuidedTour";

export type ResultView = "Anomalies" | "Trend" | "Relationships";
export type TrendLabStep = GuidedStep & { view?: ResultView };

const card = (n: number) =>
  `.trend-setup-steps > .trend-setup-step:nth-child(${n})`;

/** Guided tour of Trend Lab, from choosing an area to reading the results. */
export function trendLabTourSteps({
  hasResults,
  hasSecond,
  loading,
  onRunExample,
}: {
  hasResults: boolean;
  hasSecond: boolean;
  loading: boolean;
  onRunExample: () => void;
}): TrendLabStep[] {
  return [
    {
      id: "welcome",
      title: "Welcome to Trend Lab",
      target: ".trend-setup",
      body: (
        <p>
          You will build an investigation in four steps: choose an area, the
          indicators, a period, then generate. The results show what changed,
          how much, and with what statistical evidence. You can keep using the
          page while the tour is open.
        </p>
      ),
    },
    {
      id: "area",
      title: "1 · Choose an area",
      target: card(1),
      body: (
        <p>
          Pick a country or region, or open the globe to draw your own
          rectangle. Values are averaged over that rectangle; countries use
          their bounding box, not the border.
        </p>
      ),
    },
    {
      id: "indicators",
      title: "2 · Choose what to measure",
      target: card(2),
      body: (
        <>
          <p>
            Indicator X is the variable you study, such as air temperature. Add
            an optional Indicator Y to test whether the two move together.
          </p>
          <p>Not sure? Use one of the example buttons below the pickers.</p>
        </>
      ),
    },
    {
      id: "period",
      title: "3 · Choose the months",
      target: card(3),
      body: (
        <p>
          By default all available months are used. Longer records give more
          reliable trends: significance tests need at least 60 consecutive
          months.
        </p>
      ),
    },
    {
      id: "run",
      title: "4 · Generate the investigation",
      target: ".trend-setup-run",
      body: (
        <p>
          This bar summarises your study. Press Generate investigation to fetch
          the regional monthly series and compute the analysis.
          {hasResults
            ? " Results are ready — continue to read them."
            : " Or let the tour run a ready-made example for you."}
        </p>
      ),
      actions: hasResults ? undefined : (
        <button
          type="button"
          className="guided-tour-primary"
          disabled={loading}
          onClick={onRunExample}
        >
          {loading ? "Loading example…" : "Run the Pantanal example for me"}
        </button>
      ),
      canNext: hasResults,
      waitHint: loading ? "Loading results…" : "Generate to continue",
    },
    {
      id: "tabs",
      title: "Three ways to read the results",
      target: ".investigation-tabs",
      view: "Anomalies",
      body: (
        <p>
          Anomalies asks “was this month unusual?”, Trend asks “is it
          changing?”, and Relationships asks “do the indicators move together?”.
          The next steps open each one.
        </p>
      ),
    },
    {
      id: "anomalies",
      title: "Anomalies — unusual months",
      target: ".trend-output .investigation-chart",
      view: "Anomalies",
      body: (
        <p>
          Each month is compared with its usual value for that time of year.
          Above zero means higher than usual. The thick line is a 12-month mean:
          a steady drift up or down hints at a long-term change. Hover the chart
          to read values; the ⓘ explains more.
        </p>
      ),
    },
    {
      id: "trend",
      title: "Trend — how fast is it changing?",
      target: ".trend-output .investigation-series",
      view: "Trend",
      body: (
        <p>
          The rate of change per year and per decade, its 95% interval and the
          p-value tell you how much changed and how sure we are. Move Points A
          and B to see the change over a span; the dashed extension is not a
          forecast.
        </p>
      ),
    },
    {
      id: "relationships",
      title: "Relationships — do they move together?",
      target: hasSecond ? ".investigation-verdict" : ".investigation-tabs",
      view: "Relationships",
      body: hasSecond ? (
        <p>
          The result card gives the evidence for the selected lag. Below it, the
          lag curve shows whether Y follows X months later and the scatterplot
          shows each month pair. Association is not causation.
        </p>
      ) : (
        <p>
          This view needs a second indicator. Choose Indicator Y in step 2 and
          generate again to compare two variables.
        </p>
      ),
    },
    {
      id: "data",
      title: "Where the evidence comes from",
      target: ".trend-data-methods",
      body: (
        <p>
          Data, coverage &amp; methods lists the NASA products, units, coverage,
          the statistical method and every test. Export JSON or CSV to reproduce
          the investigation. That's the tour — enjoy exploring!
        </p>
      ),
    },
  ];
}
