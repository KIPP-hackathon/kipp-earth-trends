import { ApiError } from "./core.ts";
import { unavailableIndicatorReference } from "./indicator-reference.ts";
import type {
  IndicatorReferenceService,
  IndicatorSearchArguments,
} from "./indicator-reference.ts";
import { unavailableTrendReference } from "./trend-reference.ts";
import type {
  TrendReferenceService,
  TrendReferenceArguments,
} from "./trend-reference.ts";
import { historicalEvents, regions } from "./config.ts";
import { parseBounds, variableFor } from "./data.ts";
import type { CatalogVariable, DataService } from "./data.ts";
import {
  assertSchema,
  investigationRequest,
  trendSelectionSchema,
  assistantActionSchema,
  bboxSchema,
  monthSchema,
  objectSchema,
  validatePeriod,
  variableSchema,
} from "./assistant-contract.ts";
import type {
  TrendSelection,
  AssistantAction,
  AssistantContext,
  AssistantEvidence,
  JsonSchema,
} from "./assistant-contract.ts";
export {
  assistantRequestSchema,
  validateAssistantRequest,
} from "./assistant-contract.ts";
export type {
  AssistantAction,
  AssistantContext,
  AssistantEvidence,
  AssistantRequest,
} from "./assistant-contract.ts";

export type AssistantToolResult = {
  result: unknown;
  actions?: AssistantAction[];
  evidence?: AssistantEvidence[];
};
export type AssistantToolOptions = {
  data: Pick<DataService, "series"> &
    Partial<Pick<DataService, "investigation">>;
  catalog: () => Promise<CatalogVariable[]>;
  indicatorReference?: IndicatorReferenceService;
  trendReference?: TrendReferenceService;
};
const periodArguments = {
  variable: variableSchema,
  bbox: bboxSchema,
  start: monthSchema,
  end: monthSchema,
};
const declarations: {
  name: string;
  description: string;
  parameters: JsonSchema;
}[] = [
  {
    name: "run_investigation",
    description:
      "Run Trend Lab for one or two distinct continuous variables, exact bbox and period (at most 600 months). Returns real seasonal trend/relationship inference, all Holm tests and limitations, plus a validated action opening Trend Lab with that same selection and running it. Reference equals study period as in the UI. No causal interpretation. Use for Trend Lab analysis and to explain current results by rerunning the applied selection.",
    parameters: objectSchema({
      selection: trendSelectionSchema,
      name: { type: "string", minLength: 1, maxLength: 80 },
    }),
  },
  {
    name: "search_trends",
    description:
      "Search stored, precomputed MERRA-2 surface-temperature trend estimates. These cover fixed regions and periods, never an arbitrary drawn area. Query short region/topic keywords, optionally exact regionId/method/variable filters from returned availableFilters. Results preserve units, coverage, method, uncertainty and limitations. Compare methods that handle seasonality/autocorrelation before interpreting statistical evidence. No forecasts or causal attribution.",
    parameters: objectSchema(
      {
        query: { type: "string", minLength: 1, maxLength: 200 },
        regionId: { type: "string", minLength: 1, maxLength: 100 },
        method: { type: "string", minLength: 1, maxLength: 100 },
        variable: { type: "string", minLength: 1, maxLength: 100 },
        limit: { type: "integer", minimum: 1, maximum: 12 },
      },
      ["query"],
    ),
  },
  {
    name: "search_indicators",
    description:
      "Search the curated Databricks indicator reference by name, code or topic in English/Portuguese. Metadata is broader than the app catalog and does not prove available layers or observations. Optional filters use known reference values; no arbitrary SQL. Use describe_variable for actual coverage and authoritative runtime units.",
    parameters: objectSchema(
      {
        query: { type: "string", minLength: 1, maxLength: 200 },
        role: { type: "string", minLength: 1, maxLength: 40 },
        source: { type: "string", minLength: 1, maxLength: 40 },
        domain: { type: "string", minLength: 1, maxLength: 40 },
        accessibility: { type: "string", minLength: 1, maxLength: 40 },
        limit: { type: "integer", minimum: 1, maximum: 12 },
      },
      ["query"],
    ),
  },
  {
    name: "list_variables",
    description:
      "List the reviewed Earth-variable catalog and real monthly availability. Optional case-insensitive name/product/id filter. No simulated replacements.",
    parameters: objectSchema(
      { filter: { type: "string", minLength: 1, maxLength: 100 } },
      [],
    ),
  },
  {
    name: "describe_variable",
    description:
      "Get variable definition, units, data type, product source, quality filters, rendering and actual catalog month coverage. Useful for general questions about the lab's data.",
    parameters: objectSchema({ id: variableSchema }),
  },
  {
    name: "list_events",
    description:
      "List curated historical context, documentary sources and actual overlap with available data. These are not detected events or causal evidence.",
    parameters: objectSchema({}),
  },
  {
    name: "analyze_series",
    description:
      "Read up to 120 regional monthly aggregates in bbox west,south,east,north, including missing months and coverage. Descriptive statistics only; no significance test, prediction or causal attribution.",
    parameters: objectSchema(periodArguments),
  },
  {
    name: "compare_periods",
    description:
      "Compare two periods of at most 120 months each for the same variable and rectangle. Returns actual observed coverage, temporal means and B-minus-A difference (or category counts). No invented baseline or significance.",
    parameters: objectSchema({
      variable: variableSchema,
      bbox: bboxSchema,
      startA: monthSchema,
      endA: monthSchema,
      startB: monthSchema,
      endB: monthSchema,
    }),
  },
  {
    name: "configure_view",
    description:
      "Validate up to 12 proposed frontend actions atomically. Actions are returned for the browser to apply, not executed here. Use only actual catalog months/periods. Display ranges never filter scientific analysis. set_area selects a study rectangle, not an event footprint.",
    parameters: objectSchema({
      actions: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: assistantActionSchema,
      },
    }),
  },
];
function sourceFor(product: string): string {
  if (product.startsWith("MERRA-2"))
    return "https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/";
  if (product.startsWith("GPM")) return "https://gpm.nasa.gov/data/imerg";
  if (product.startsWith("GRACE"))
    return "https://doi.org/10.5067/TEMSC-3JC634";
  if (product.startsWith("MODIS"))
    return "https://lpdaac.usgs.gov/products/mod13c2v061/";
  if (product.startsWith("NSIDC"))
    return "https://nsidc.org/data/g02135/versions/4";
  throw new ApiError(
    422,
    "UNSUPPORTED_PRODUCT",
    "Product has no reviewed source reference.",
  );
}
function dataType(product: string) {
  if (product.includes("COSP")) return "model-simulated satellite diagnostic";
  return product.startsWith("MERRA-2")
    ? "reanalysis"
    : "satellite-derived estimate";
}
function validMonths(variable: CatalogVariable): string[] {
  return [
    ...new Set(
      variable.months
        .filter((m) => (m.validSamples ?? 0) > 0)
        .map((m) => m.month),
    ),
  ].sort();
}
function lookup(catalog: CatalogVariable[], id: string): CatalogVariable {
  variableFor(id);
  const variable = catalog.find((v) => v.id === id);
  if (!variable)
    throw new ApiError(
      422,
      "VARIABLE_UNAVAILABLE",
      "Variable is absent from the current catalog.",
    );
  return variable;
}
function definition(variable: CatalogVariable) {
  return {
    id: variable.id,
    name: variable.name,
    quantity: variable.quantity,
    description: variable.description,
    unit: variable.unit,
    sourceUnit: variable.sourceUnit,
    product: variable.product,
    run: variable.run,
    processingNote: variable.processingNote,
    dataType: dataType(variable.product),
    source: sourceFor(variable.product),
    simulated: false,
    aggregation: variable.aggregation,
    conversion: variable.conversion,
    quality: variable.quality,
    nativeGrid: variable.nativeGrid,
    render: variable.render,
    available: variable.available,
    firstMonth: variable.firstMonth,
    lastMonth: variable.lastMonth,
    months: variable.months,
    unavailableReason: variable.unavailableReason,
  };
}
const scientificLimitations = [
  "Descriptive analysis of the selected period only. Short records do not establish a long-term climate trend.",
  "Seasonality and serial autocorrelation are not removed or modeled. No p-value, confidence interval, significance or causal attribution is calculated.",
  "A rectangular bbox is a study area, not a basin polygon, event footprint or an event detection.",
  "Missing months are null, never zero. Temporal means weight each available month equally; incomplete coverage can affect comparisons.",
  "Display colors and hidden cells do not filter the regional series.",
];
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
type Observation = {
  month: string;
  value: number | null;
  coverage: number | null;
  samples: number | null;
  processingRun?: string;
};
function summarize(
  variable: CatalogVariable,
  observations: Observation[],
  months: string[],
) {
  const valid = observations.filter((o): o is Observation & { value: number } =>
    finite(o.value),
  );
  const missingMonths = observations
    .filter((o) => o.value === null)
    .map((o) => o.month);
  const coverageValues = valid.map((o) => o.coverage).filter(finite);
  const coverage = {
    expectedMonths: months.length,
    validMonths: valid.length,
    missingMonths,
    validMonthFraction: valid.length / months.length,
    firstObservedMonth: valid[0]?.month ?? null,
    lastObservedMonth: valid.at(-1)?.month ?? null,
    meanSpatialValidAreaFraction: coverageValues.length
      ? coverageValues.reduce((a, b) => a + b, 0) / coverageValues.length
      : null,
    note: "Spatial coverage is valid source-grid weight within available rows, not guaranteed fraction of all Earth area or a full basin.",
  };
  if (
    variable.render.kind === "categorical" ||
    variable.aggregation === "weighted_mode"
  ) {
    return {
      coverage,
      summary: {
        kind: "categorical" as const,
        categoryCounts: (variable.render.categories ?? []).map((category) => ({
          ...category,
          months: valid.filter((o) => o.value === category.value).length,
        })),
        note: "Counts are months of the regional weighted modal class, not source-cell counts, area or ice extent. No numeric mean or slope applies.",
      },
    };
  }
  const values = valid.map((o) => o.value),
    first = valid[0],
    last = valid.at(-1);
  let slopePerYear: number | null = null;
  if (valid.length >= 3) {
    const monthIndex = (month: string) =>
      Number(month.slice(0, 4)) * 12 + Number(month.slice(5));
    const origin = monthIndex(valid[0].month);
    const xs = valid.map((o) => (monthIndex(o.month) - origin) / 12);
    const xbar = xs.reduce((a, b) => a + b, 0) / xs.length;
    const ybar = values.reduce((a, b) => a + b, 0) / values.length;
    const denominator = xs.reduce((a, x) => a + (x - xbar) ** 2, 0);
    const numerator = xs.reduce(
      (a, x, i) => a + (x - xbar) * (values[i] - ybar),
      0,
    );
    const slope = numerator / denominator;
    slopePerYear = denominator > 0 && finite(slope) ? slope : null;
  }
  return {
    coverage,
    summary: {
      kind: "continuous" as const,
      mean: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
      minimum: values.length ? Math.min(...values) : null,
      maximum: values.length ? Math.max(...values) : null,
      first: first ? { month: first.month, value: first.value } : null,
      last: last ? { month: last.month, value: last.value } : null,
      firstToLastChange:
        first && last && valid.length >= 2 ? last.value - first.value : null,
      slopePerYear,
      slopeUnit: `${variable.unit}/year`,
      slopeMethod:
        "ordinary least squares using actual calendar month positions; descriptive, not a significance test",
      temporalAggregation:
        variable.aggregation === "sum"
          ? "arithmetic temporal mean of monthly spatial sums; not a cumulative mass sum over time"
          : "arithmetic temporal mean of available monthly regional aggregates",
    },
  };
}

export function createAssistantTools({
  data,
  catalog,
  indicatorReference,
  trendReference,
}: AssistantToolOptions) {
  async function analyze(
    variable: CatalogVariable,
    bbox: string,
    start: string,
    end: string,
  ) {
    const months = validatePeriod(start, end);
    parseBounds(bbox);
    const available = validMonths(variable),
      availableSet = new Set(available);
    const catalogAvailableMonths = months.filter((m) => availableSet.has(m));
    let series: Awaited<ReturnType<DataService["series"]>> | undefined;
    if (catalogAvailableMonths.length) {
      try {
        series = await data.series(variable.id, start, end, bbox);
      } catch (error) {
        if (error instanceof ApiError && error.code === "NO_DATA") {
          /* Preserve gaps without invented observations. */
        } else if (error instanceof ApiError) throw error;
        else
          throw new ApiError(
            502,
            "ASSISTANT_SOURCE_UNAVAILABLE",
            "Earth data source is temporarily unavailable.",
          );
      }
    }
    const categoryValues = new Set(
      variable.render.categories?.map((c) => c.value),
    );
    const rows = new Map(series?.observations.map((o) => [o.month, o]) ?? []);
    const observations: Observation[] = months.map((month) => {
      const row = rows.get(month);
      const coverage =
        finite(row?.coverage) && row.coverage >= 0 && row.coverage <= 1
          ? row.coverage
          : null;
      const value =
        availableSet.has(month) &&
        finite(row?.value) &&
        coverage !== null &&
        coverage > 0 &&
        (variable.render.kind !== "categorical" ||
          categoryValues.has(row.value))
          ? row.value
          : null;
      return {
        month,
        value,
        coverage,
        samples: finite(row?.samples) && row.samples >= 0 ? row.samples : null,
        ...(row?.processingRun ? { processingRun: row.processingRun } : {}),
      };
    });
    const nowMonth = new Date().toISOString().slice(0, 7);
    return {
      variable: variable.id,
      unit: variable.unit,
      product: variable.product,
      run: variable.run,
      processingNote: variable.processingNote,
      source: sourceFor(variable.product),
      dataType: dataType(variable.product),
      simulated: false,
      bbox,
      start,
      end,
      aggregation: variable.aggregation,
      method:
        series?.method ??
        (variable.aggregation === "sum"
          ? "monthly sum of valid source-cell mass; no extra spatial weighting"
          : variable.aggregation === "weighted_mode"
            ? "monthly class mode weighted by cos(latitude); ties choose class 0"
            : "monthly mean weighted by cos(latitude) and valid area coverage"),
      quality: variable.quality,
      observations,
      ...summarize(variable, observations, months),
      availability: {
        firstMonth: available[0] ?? null,
        lastMonth: available.at(-1) ?? null,
        catalogAvailableMonths,
        catalogUnavailableMonths: months.filter((m) => !availableSet.has(m)),
        futureMonths: months.filter((m) => m > nowMonth),
        status: observations.some((o) => o.value !== null)
          ? "observed"
          : "unavailable",
        note: "Catalog availability is global; the selected rectangle can have additional missing values. Future/unavailable dates have no substituted observations.",
      },
      limitations: [
        ...scientificLimitations,
        ...(series?.limitations ?? []),
        ...variable.quality.notes,
      ],
    };
  }
  async function validateActions(
    raw: unknown,
    context: AssistantContext,
    entries: CatalogVariable[],
  ): Promise<AssistantAction[]> {
    assertSchema(raw, {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: assistantActionSchema,
    });
    const actions = raw as AssistantAction[];
    if (actions.some((a) => a.type === "run_investigation"))
      throw new ApiError(
        400,
        "USE_INVESTIGATION_TOOL",
        "Use run_investigation to compute evidence and configure Trend Lab atomically.",
      );
    const finalTab =
      actions.filter((action) => action.type === "set_tab").at(-1)?.tab ??
      context.tab;
    if (finalTab === "trend" && actions.some((a) => a.type !== "set_tab"))
      throw new ApiError(
        400,
        "USE_INVESTIGATION_TOOL",
        "Trend Lab selections use run_investigation; globe panel actions do not control this workspace.",
      );
    const switchesWorkspace =
      (context.tab === "compare") !== (finalTab === "compare");
    const setsArea = actions.some((action) => action.type === "set_area");
    if (
      switchesWorkspace &&
      actions.some(
        (action) =>
          action.type === "set_panel" &&
          ((!action.regionId && !setsArea) || !action.start || !action.end),
      )
    )
      throw new ApiError(
        400,
        "DESTINATION_FILTERS_REQUIRED",
        "Explore and Comparison have independent filters. When switching workspaces, every set_panel must specify start, end and regionId, or set_area must explicitly provide the desired bbox. To reuse the drawn source area, use its exact context region.id or bbox.",
      );
    for (const action of actions) {
      if (action.type === "set_area") {
        parseBounds(action.bbox);
        if (!action.name.trim())
          throw new ApiError(
            400,
            "INVALID_AREA",
            "Study area name cannot be blank.",
          );
      }
      if (action.type === "set_panel") {
        const variable = lookup(entries, action.variable),
          available = validMonths(variable);
        if (!available.includes(action.month))
          throw new ApiError(
            422,
            "MONTH_UNAVAILABLE",
            "Selected month has no valid observations in the current catalog.",
          );
        if ((action.start === undefined) !== (action.end === undefined))
          throw new ApiError(
            400,
            "INVALID_PERIOD",
            "Provide both start and end.",
          );
        if (action.start !== undefined && action.end !== undefined) {
          const requested = validatePeriod(action.start, action.end);
          if (
            !requested.every((m) => available.includes(m)) ||
            action.month < action.start ||
            action.month > action.end
          )
            throw new ApiError(
              422,
              "PERIOD_UNAVAILABLE",
              "Panel period must contain its selected month and only actual available catalog months.",
            );
        }
        if (action.regionId && !regions.some((r) => r.id === action.regionId)) {
          const custom = context.panels.find(
            (p) =>
              p.region.id === action.regionId &&
              /^custom(?:[-_][a-zA-Z0-9_-]+)?$/.test(p.region.id),
          )?.region;
          if (!custom)
            throw new ApiError(
              422,
              "REGION_UNAVAILABLE",
              "Use a configured study region or the current custom rectangle.",
            );
          parseBounds(custom.bbox);
        }
      }
      if (action.type === "set_range") {
        const variable = lookup(entries, action.variable);
        if (
          variable.render.kind !== "continuous" ||
          action.minimum >= action.maximum ||
          !finite(action.maximum - action.minimum)
        )
          throw new ApiError(
            400,
            "INVALID_RANGE",
            "Select an increasing finite range for a continuous variable.",
          );
      }
    }
    // No mutation or execution occurs before every action passes validation.
    return structuredClone(actions);
  }
  return {
    declarations,
    async execute(
      name: string,
      raw: unknown,
      context: AssistantContext,
    ): Promise<AssistantToolResult> {
      const declaration = declarations.find((d) => d.name === name);
      if (!declaration)
        throw new ApiError(
          400,
          "UNKNOWN_ASSISTANT_TOOL",
          "Unsupported assistant tool.",
        );
      assertSchema(raw, declaration.parameters);
      const args = raw as Record<string, unknown>;
      if (name === "search_trends") {
        const result = trendReference
          ? await trendReference.search(args as TrendReferenceArguments)
          : unavailableTrendReference();
        return {
          result,
          evidence: [
            {
              title: "Precomputed MERRA-2 trends",
              detail:
                result.status === "reference"
                  ? `${result.referenceTable}; ${result.returnedCount} of ${result.matchedCount} stored trend matches. Interpret only the exact returned method, region, period and unit; these are not a trend calculation for the current drawn area.`
                  : `${result.referenceTable}; stored trends unavailable. No estimates were invented.`,
            },
          ],
        };
      }
      if (name === "search_indicators") {
        const result = indicatorReference
          ? await indicatorReference.search(args as IndicatorSearchArguments)
          : unavailableIndicatorReference();
        return {
          result,
          evidence: [
            {
              title: "Curated indicator reference",
              detail:
                result.status === "reference"
                  ? `${result.referenceTable}; ${result.returnedCount} of ${result.matchedCount} metadata matches. Stage, role and reviewed mapping are supplied per result; actual observation availability is not checked.`
                  : `${result.referenceTable}; reference unavailable. No observations or metadata were invented.`,
            },
          ],
        };
      }
      let entries: CatalogVariable[];
      try {
        entries = await catalog();
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(
          502,
          "ASSISTANT_SOURCE_UNAVAILABLE",
          "Earth data catalog is temporarily unavailable.",
        );
      }
      if (name === "run_investigation") {
        if (!data.investigation)
          throw new ApiError(
            503,
            "INVESTIGATION_UNAVAILABLE",
            "Trend Lab is unavailable.",
          );
        const selection = args.selection as TrendSelection;
        const request = investigationRequest(selection);
        for (const id of [selection.x, selection.y].filter(
          (id): id is string => !!id,
        )) {
          const variable = lookup(entries, id);
          const months = validMonths(variable);
          if (
            !variable.available ||
            variable.render.kind === "categorical" ||
            variable.aggregation === "weighted_mode" ||
            !months.includes(selection.start) ||
            !months.includes(selection.end)
          )
            throw new ApiError(
              422,
              "INVALID_INVESTIGATION_SELECTION",
              "Select available continuous variables with observations at both period endpoints. Internal gaps remain explicit.",
            );
        }
        const result = await data.investigation(request);
        return {
          result: {
            request: result.request,
            generatedAt: result.generatedAt,
            simulated: result.simulated,
            series: result.series.map(
              ({
                observations,
                referenceObservations: _reference,
                ...source
              }) => ({
                ...source,
                dataType: dataType(lookup(entries, source.variable).product),
                coverage: {
                  expectedMonths: observations.length,
                  validMonths: observations.filter((o) => o.value !== null)
                    .length,
                  missingMonths: observations
                    .filter((o) => o.value === null)
                    .map((o) => o.month),
                },
                processingRuns: [
                  ...new Set(
                    observations.flatMap((o) =>
                      o.processingRun ? [o.processingRun] : [],
                    ),
                  ),
                ],
              }),
            ),
            lags: result.lags.map(({ pairs: _pairs, ...lag }) => lag),
            family: result.family,
            analysis: result.analysis,
            limitations: result.limitations,
            viewStatus: "validated_for_frontend",
            note: "Browser will run the same selection through the investigation endpoint. This summary is computed at generatedAt; a later refresh can reflect updated source data.",
          },
          actions: [
            { type: "run_investigation", selection, name: String(args.name) },
          ],
          evidence: [
            {
              title: "Trend Lab investigation",
              detail: `${selection.x}${selection.y ? ` / ${selection.y}` : ""}; bbox ${selection.bbox}; ${selection.start}–${selection.end}; ${result.generatedAt}. Seasonal OLS/HAC12; full Holm family; association is not causation.`,
            },
          ],
        };
      }
      if (name === "list_variables") {
        const filter = String(args.filter ?? "").toLocaleLowerCase();
        return {
          result: {
            simulated: false,
            variables: entries
              .filter((v) =>
                `${v.id} ${v.name} ${v.product}`
                  .toLocaleLowerCase()
                  .includes(filter),
              )
              .map((v) => ({
                id: v.id,
                name: v.name,
                unit: v.unit,
                product: v.product,
                run: v.run,
                kind: v.render.kind,
                available: v.available,
                firstMonth: v.firstMonth,
                lastMonth: v.lastMonth,
                validMonthCount: validMonths(v).length,
                source: sourceFor(v.product),
                dataType: dataType(v.product),
              })),
            note: "Use describe_variable for definition, monthly coverage, QA, aggregation and rendering.",
          },
        };
      }
      if (name === "describe_variable")
        return { result: definition(lookup(entries, String(args.id))) };
      if (name === "list_events")
        return {
          result: {
            curated: true,
            detected: false,
            events: historicalEvents.map((event) => {
              const variable = entries.find((v) => v.id === event.variable);
              const months = variable
                ? validMonths(variable).filter(
                    (m) => m >= event.window[0] && m <= event.window[1],
                  )
                : [];
              const available =
                months.length > 0 && event.category !== "Tsunamis";
              return {
                ...event,
                bbox: regions.find((r) => r.id === event.region)?.bbox,
                available,
                months: available ? months : [],
                unavailableReason: available
                  ? null
                  : event.category === "Tsunamis"
                    ? "No sea-level or seismic data layer; monthly rain and temperature do not represent tsunami waves."
                    : "No actual catalog observations overlap the historical window.",
              };
            }),
            limitations: scientificLimitations,
          },
        };
      if (name === "configure_view") {
        const actions = await validateActions(args.actions, context, entries);
        return {
          result: {
            status: "validated_for_frontend",
            actions,
            note: "The browser must apply and report actual state. No view change has been executed by the backend.",
          },
          actions,
          evidence: [
            {
              title: "Validated view commands",
              detail: `${actions.length} commands validated against the actual catalog; display changes do not change scientific series.`,
            },
          ],
        };
      }
      const variable = lookup(entries, String(args.variable));
      const bbox = String(args.bbox);
      parseBounds(bbox);
      if (name === "analyze_series") {
        const result = await analyze(
          variable,
          bbox,
          String(args.start),
          String(args.end),
        );
        return {
          result,
          evidence: [
            {
              title: variable.name,
              detail: `${result.start} to ${result.end}; ${result.coverage.validMonths}/${result.coverage.expectedMonths} valid monthly regional values; ${variable.unit}; ${variable.product}. Descriptive analysis only.`,
              source: result.source,
            },
          ],
        };
      }
      const [a, b] = await Promise.all([
        analyze(variable, bbox, String(args.startA), String(args.endA)),
        analyze(variable, bbox, String(args.startB), String(args.endB)),
      ]);
      const overlap = a.start <= b.end && b.start <= a.end;
      const continuous =
        a.summary.kind === "continuous" && b.summary.kind === "continuous";
      const difference =
        continuous &&
        "mean" in a.summary &&
        "mean" in b.summary &&
        finite(a.summary.mean) &&
        finite(b.summary.mean)
          ? b.summary.mean - a.summary.mean
          : null;
      return {
        result: {
          variable: variable.id,
          unit: variable.unit,
          product: variable.product,
          source: sourceFor(variable.product),
          simulated: false,
          bbox,
          periodA: a,
          periodB: b,
          differenceBMinusA: difference,
          comparisonMethod: continuous
            ? "B minus A of arithmetic temporal means of actual monthly regional aggregates; not a trend or significance test"
            : "compare counts of monthly regional modal classes; numeric differences do not apply",
          warnings: [
            ...(overlap
              ? [
                  "Periods overlap; they share observations and are not independent.",
                ]
              : []),
            ...(a.coverage.missingMonths.length ||
            b.coverage.missingMonths.length
              ? [
                  "One or both periods are incomplete; compare actual observed months and seasonality before interpreting their difference.",
                ]
              : []),
            ...scientificLimitations,
          ],
        },
        evidence: [
          {
            title: `Period comparison · ${variable.name}`,
            detail: `A ${a.start}–${a.end}: ${a.coverage.validMonths}/${a.coverage.expectedMonths} months; B ${b.start}–${b.end}: ${b.coverage.validMonths}/${b.coverage.expectedMonths} months; ${variable.unit}. No significance or causal attribution.`,
            source: sourceFor(variable.product),
          },
        ],
      };
    },
  };
}
