import { MIN_GLOBE_ZOOM, MAX_GLOBE_ZOOM } from "./lib/globeZoom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Earth,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { LabTabs, labTabs } from "./components/LabTabs";
import type { LabTab } from "./components/LabTabs";
import { EventExplorer } from "./components/EventExplorer";
import { TrendLab } from "./components/TrendLab";
import { RealPanel } from "./components/RealDataView";
import { SpaceBackdrop } from "./components/SpaceBackdrop";
import { useCountryLocation } from "./lib/useCountryLocation";
import { brazilCountry } from "./lib/countries";
import type { CountrySelection } from "./lib/countries";
import "./country-location.css";
import { Modal } from "./components/Modal";
import { initialGlobeView } from "./lib/comparison";
import { useGlobeCamera } from "./lib/useGlobeCamera";
import { loadCatalog, loadConfig, realMonth } from "./lib/earthApi";
import type {
  EarthColorRange,
  EarthConfig,
  EarthEvent,
  EarthVariable,
} from "./lib/earthApi";
import { useEarthResource } from "./lib/useEarthResource";
import { invalidateFrames } from "./lib/earthFrameCache";
import { earthReadCache } from "./lib/earthReadCache";
import { Assistant } from "./components/Assistant";
import { parseStudyBbox, validateAssistantActions } from "./lib/assistant";
import type {
  AssistantContext,
  AssistantResponse,
  PanelPreset,
  PanelSide,
  PanelSnapshot,
  PlaybackCommand,
} from "./lib/assistant";
import type { EarthRegion } from "./lib/earthApi";
import type { GlobeView } from "./lib/comparison";

function RequestFailure({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="real-error" role="alert">
      <p>{message}</p>
      <button onClick={retry}>
        <RefreshCw size={14} /> Try again
      </button>
    </div>
  );
}
const guide = [
  {
    title: "Explore change in Trend Lab",
    text: "Choose an area, indicator and study period, then run the experiment. Project ahead starts at the last valid month. Explore past change keeps both endpoints inside the historical record. The displayed change is the fitted slope multiplied by elapsed months. Endpoints represent the fitted line. Future extensions assume that slope continues and can exceed physical bounds. The 95% interval describes fitted change, with future individual observations carrying additional uncertainty.",
  },
  {
    title: "Read the statistical report",
    text: "Trend Lab fits calendar-month effects and linear time, with Newey–West HAC12 uncertainty. Trend slopes use 13 model parameters; lagged relationships use 14. Inference requires 60 consecutive valid months and nondegenerate variation. Holm adjustment covers every applied trend and lag test. Missing months remain gaps; short or gapped results can be descriptive without inference.",
  },
  {
    title: "Interpret the evidence carefully",
    text: "Trend Lab assumes a linear time component, fixed calendar-month effects and short-memory residual dependence. HAC12 and Holm adjustment do not correct all model violations or repeated exploratory choices. Baseline and native product uncertainty are not propagated. Significance alone establishes neither practical importance nor causality. Short records offer limited evidence about long-term climate change. Country areas use bounding rectangles. Inspect product type, units, coverage and provenance alongside the result.",
  },
  {
    title: "Start with a question",
    text: "Explore any available variable, country or drawn area. Event presets are editable starting points; no name or account is needed to begin.",
  },
  {
    title: "Follow the evidence",
    text: "Choose a monthly period and inspect regional and global series. The global field stays visible. Shading marks a historical event window, not a detected impact or its cause.",
  },
  {
    title: "Compare with context",
    text: "Two independent panels share a camera and consistent colors for the same variable. Compare matching calendar months where possible; adjacent periods can differ because of seasonality.",
  },
  {
    title: "Assess change and uncertainty",
    text: "Ask the assistant about stored trend studies and inspect their methods, coverage and uncertainty. Estimates apply only to their exact variable, region and period. This short record does not establish a long-term climate trend; a non-significant result does not establish no change.",
  },
];
function Guide({ config }: { config?: EarthConfig }) {
  return (
    <div className="real-guide-grid">
      {guide.map((step, index) => (
        <article className="real-info-card" key={step.title}>
          <span className="eyebrow">0{index + 1} · FIELD GUIDE</span>
          <h2>{step.title}</h2>
          <p>{step.text}</p>
        </article>
      ))}
      <article className="real-info-card">
        <ShieldCheck size={21} />
        <h2>Scope and limitations</h2>
        {config?.limitations.map((limitation) => (
          <p key={limitation}>{limitation}</p>
        ))}
      </article>
    </div>
  );
}
const globalStudyRegion: EarthRegion = {
  id: "custom-global",
  name: "Global view",
  bbox: "-180,-90,180,90",
  longitude: initialGlobeView.longitude,
  latitude: initialGlobeView.latitude,
};

// Each workspace owns its camera and panel state. Only immutable catalog/data
// caches are shared; changing Explore cannot mutate a comparison scenario.
function useLabWorkspace(onManualChange: () => void) {
  const camera = useGlobeCamera(initialGlobeView);
  const snapshots = useRef<Partial<Record<PanelSide, PanelSnapshot>>>({});
  const [ready, setReady] = useState(false);
  const [studies, setStudies] = useState<
    Partial<Record<PanelSide, PanelSnapshot>>
  >({});
  const [colorRanges, setColorRanges] = useState<
    Record<string, EarthColorRange>
  >({});
  const [presets, setPresets] = useState<
    Partial<Record<PanelSide, PanelPreset>>
  >({});
  const [playbackCommands, setPlaybackCommands] = useState<
    Partial<Record<PanelSide, PlaybackCommand>>
  >({});
  const [customRegions, setCustomRegions] = useState<EarthRegion[]>([]);
  const [eventContext, setEventContext] = useState<EarthEvent>();
  const receiveSnapshot = useCallback((snapshot: PanelSnapshot) => {
    snapshots.current[snapshot.side] = snapshot;
    setStudies((previous) => {
      const last = previous[snapshot.side];
      if (
        last &&
        last.variable === snapshot.variable &&
        last.start === snapshot.start &&
        last.end === snapshot.end &&
        last.region.id === snapshot.region.id &&
        last.region.bbox === snapshot.region.bbox &&
        JSON.stringify(last.layers) === JSON.stringify(snapshot.layers) &&
        last.comparisonMode === snapshot.comparisonMode
      )
        return previous;
      return { ...previous, [snapshot.side]: snapshot };
    });
    if (snapshot.side === "A") setReady(true);
  }, []);
  const registerRegion = useCallback((region: EarthRegion) => {
    setCustomRegions((previous) => [
      ...previous.filter((entry) => entry.id !== region.id),
      structuredClone(region),
    ]);
  }, []);
  const acknowledgePlayback = useCallback((side: PanelSide, nonce: number) => {
    setPlaybackCommands((previous) => {
      if (previous[side]?.nonce !== nonce) return previous;
      const next = { ...previous };
      delete next[side];
      return next;
    });
  }, []);
  const setPreset = useCallback((side: PanelSide, preset: PanelPreset) => {
    setPresets((previous) => ({ ...previous, [side]: preset }));
  }, []);
  const changeView = useCallback(
    (next: GlobeView) => {
      onManualChange();
      camera.setView(next);
    },
    [onManualChange, camera.setView],
  );
  const navigateView = useCallback(
    (next: GlobeView) => {
      onManualChange();
      camera.flyTo(next);
    },
    [onManualChange, camera.flyTo],
  );
  const changeColorRange = useCallback(
    (variable: string, value?: EarthColorRange) => {
      onManualChange();
      setColorRanges((previous) => {
        const next = { ...previous };
        if (value) next[variable] = value;
        else delete next[variable];
        return next;
      });
    },
    [onManualChange],
  );
  const live = useRef({ view: camera.view, colorRanges });
  live.current = { view: camera.view, colorRanges };
  const getContext = useCallback(
    (tab: LabTab, version: number, includeLayers = false): AssistantContext => {
      const snapshotsForTab = [
        snapshots.current.A,
        ...(tab === "compare" ? [snapshots.current.B] : []),
      ].filter((panel): panel is PanelSnapshot => !!panel);
      const panels = snapshotsForTab.map((panel) => {
        if (includeLayers) return panel;
        const { layers: _layers, layerMonths: _layerMonths, ...wire } = panel;
        return wire;
      });
      const primaryIds = new Set(panels.map((panel) => panel.variable));
      return structuredClone({
        version,
        tab,
        panels,
        camera: live.current.view,
        colorRanges: includeLayers
          ? live.current.colorRanges
          : Object.fromEntries(
              Object.entries(live.current.colorRanges).filter(([id]) =>
                primaryIds.has(id),
              ),
            ),
      });
    },
    [],
  );
  return {
    camera,
    ready,
    studies,
    colorRanges,
    setColorRanges,
    presets,
    setPresets,
    setPreset,
    playbackCommands,
    setPlaybackCommands,
    acknowledgePlayback,
    customRegions,
    registerRegion,
    eventContext,
    setEventContext,
    receiveSnapshot,
    changeView,
    navigateView,
    changeColorRange,
    getContext,
  };
}

function App() {
  const version = useRef(
    typeof window !== "undefined" &&
      window.location.hash.startsWith("#investigation=")
      ? 1
      : 0,
  );
  const commandNonce = useRef(0);
  const markChanged = useCallback(() => {
    version.current++;
  }, []);
  const [active, setActive] = useState<LabTab>("explore");
  const exploration = useLabWorkspace(markChanged);
  const comparison = useLabWorkspace(markChanged);
  const location = useCountryLocation();
  const [startingCountry, setStartingCountry] = useState(brazilCountry);
  const locationVersion = useRef(0);
  const handledLocation = useRef<string | null>(null);
  const applyCountry = (country: CountrySelection) => {
    markChanged();
    setStartingCountry(country);
    exploration.setEventContext(undefined);
    const panel = exploration.getContext("explore", version.current, true)
      .panels[0];
    if (panel)
      exploration.setPreset("A", {
        variable: panel.variable,
        ...(panel.layers ? { layers: panel.layers } : {}),
        comparisonMode: panel.comparisonMode,
        month: panel.selectedMonth ?? panel.end,
        start: panel.start,
        end: panel.end,
        region: country.region.id,
        nonce: ++commandNonce.current,
      });
    exploration.camera.flyTo({
      ...exploration.camera.view,
      longitude: country.region.longitude,
      latitude: country.region.latitude,
    });
  };
  useEffect(() => {
    if (location.status === "locating") {
      handledLocation.current = null;
      return;
    }
    if (
      location.status !== "detected" ||
      handledLocation.current === location.country.countryCode
    )
      return;
    handledLocation.current = location.country.countryCode;
    // The permission dialog can resolve after someone has already drawn or
    // navigated. A late location must never overwrite that manual work.
    if (version.current === locationVersion.current)
      applyCountry(location.country);
    // Only a new permission result bootstraps a country, not camera/data renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.status, location.country]);
  const [modal, setModal] = useState<"sources" | "guide" | null>(null);
  const catalog = useEarthResource("catalog", loadCatalog);
  const config = useEarthResource("configuration", loadConfig);
  const configFor = (
    workspace: ReturnType<typeof useLabWorkspace>,
    country?: EarthRegion,
  ) =>
    config.data
      ? {
          ...config.data,
          regions: [
            ...new Map(
              [
                ...config.data.regions,
                globalStudyRegion,
                ...(country ? [country] : []),
                ...workspace.customRegions,
              ].map((region) => [region.id, region]),
            ).values(),
          ],
        }
      : undefined;
  const explorationConfig = configFor(exploration, startingCountry.region);
  const comparisonConfig = configFor(comparison);
  const activeTab = useRef(active);
  activeTab.current = active;
  const getWorkspaceContext = useCallback(
    (tab: LabTab): AssistantContext => {
      const context = (tab === "compare" ? comparison : exploration).getContext(
          tab,
          version.current,
          catalog.data?.capabilities?.layeredAssistant === true,
        ),
        supportsComparison =
          catalog.data?.capabilities?.comparisonCharts === true;
      return supportsComparison
        ? context
        : {
            ...context,
            panels: context.panels.map(
              ({ comparisonMode: _mode, ...panel }) => panel,
            ),
          };
    },
    [
      comparison.getContext,
      exploration.getContext,
      catalog.data?.capabilities?.layeredAssistant,
      catalog.data?.capabilities?.comparisonCharts,
    ],
  );
  const getContext = useCallback(
    () => getWorkspaceContext(activeTab.current),
    [getWorkspaceContext],
  );
  const isExploration = active === "explore";
  const showTab = (tab: LabTab) => {
    markChanged();
    setActive(tab);
    requestAnimationFrame(() =>
      document.getElementById(`tab-${tab}`)?.focus({ preventScroll: true }),
    );
  };
  const eventMonths = (event: EarthEvent, variable: EarthVariable) => {
    const months = variable.months
      .filter((row) => row.validSamples > 0)
      .map((row) => row.month)
      .sort();
    const during = months.filter(
      (month) => month >= event.window[0] && month <= event.window[1],
    );
    const size = Math.max(1, during.length);
    return {
      months,
      during,
      before: months.filter((month) => month < event.window[0]).slice(-size),
      after: months.filter((month) => month > event.window[1]).slice(0, size),
    };
  };
  const applyEvent = (
    event: EarthEvent,
    compare: boolean,
    variableId = event.variable,
  ) => {
    const variable = catalog.data?.variables.find(
      (entry) => entry.id === variableId,
    );
    if (!event.available || !variable) return;
    const { during, before, after } = eventMonths(event, variable);
    if (!during.length) return;
    markChanged();
    const workspace = compare ? comparison : exploration;
    const nonce = ++commandNonce.current;
    const a = compare
      ? before.length
        ? before
        : [during[0]]
      : [before.at(-1) ?? during[0], after[0] ?? during.at(-1)!];
    const b = before.length ? during : [during.at(-1)!];
    workspace.setPreset("A", {
      variable: variable.id,
      region: event.region,
      month: compare ? a.at(-1)! : during.at(-1)!,
      start: a[0],
      end: a.at(-1)!,
      nonce,
    });
    if (compare)
      workspace.setPreset("B", {
        variable: variable.id,
        region: event.region,
        month: b.at(-1)!,
        start: b[0],
        end: b.at(-1)!,
        nonce,
      });
    workspace.setPlaybackCommands({});
    workspace.setEventContext(event);
    workspace.camera.flyTo({
      ...workspace.camera.view,
      longitude: event.longitude,
      latitude: event.latitude,
    });
    showTab(compare ? "compare" : "explore");
  };
  const applyAssistantResponse = (
    response: AssistantResponse,
    requested: AssistantContext,
  ) => {
    // Versions represent explicit view edits. Playback and network progress keep
    // refreshing snapshots without invalidating a pending pause/view command.
    const current = getContext();
    const frameAdvanced = requested.panels.some((panel) => {
      const latest = current.panels.find((entry) => entry.side === panel.side);
      return (
        latest?.selectedMonth !== panel.selectedMonth ||
        latest?.displayedMonth !== panel.displayedMonth
      );
    });
    const snapshotNotice = frameAdvanced
      ? "The timeline advanced while this request was running. Analysis refers to the dated request snapshot below."
      : current.version !== requested.version
        ? "This response refers to the dated request snapshot below; the lab view has changed since it was sent."
        : "";
    if (!response.actions.length) return snapshotNotice;
    if (
      response.contextVersion !== requested.version ||
      current.version !== requested.version
    )
      return "The view changed while this request was running. No commands applied; please retry with the current view.";
    const finalTab = response.actions.reduce<LabTab>((tab, raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return tab;
      const action = raw as Record<string, unknown>;
      return action.type === "set_tab" &&
        labTabs.some((entry) => entry.id === action.tab)
        ? (action.tab as LabTab)
        : tab;
    }, current.tab);
    const workspace = finalTab === "compare" ? comparison : exploration;
    const workspaceConfig =
      finalTab === "compare" ? comparisonConfig : explorationConfig;
    if (!catalog.data || !workspaceConfig)
      return "The catalog is unavailable. No commands applied.";
    const destination = getWorkspaceContext(finalTab);
    // A cross-tab command may explicitly reuse a source area. Copy its geometry
    // at this moment, never share a mutable selection/region registry.
    const importedRegions = [
      ...new Map(
        current.panels
          .map((panel) => panel.region)
          .filter(
            (region) =>
              region.id.startsWith("custom-") &&
              response.actions.some(
                (raw) =>
                  raw &&
                  typeof raw === "object" &&
                  !Array.isArray(raw) &&
                  (raw as Record<string, unknown>).type === "set_panel" &&
                  (raw as Record<string, unknown>).regionId === region.id,
              ),
          )
          .map((region) => [region.id, region]),
      ).values(),
    ];
    const validationConfig = {
      ...workspaceConfig,
      regions: [
        ...workspaceConfig.regions.filter(
          (region) => !importedRegions.some((entry) => entry.id === region.id),
        ),
        ...importedRegions,
      ],
    };
    const actions = validateAssistantActions(
      response.actions,
      catalog.data,
      validationConfig,
      destination,
    );
    if (!actions)
      return "The proposed view commands could not be validated. No commands applied.";
    if (
      (current.tab === "compare") !== (finalTab === "compare") &&
      !actions.some((action) => action.type === "set_area") &&
      actions.some((action) => action.type === "set_panel" && !action.regionId)
    )
      return "Explore and Comparison have independent study areas. The proposed commands did not specify the destination areas, so no commands were applied. Please retry.";
    const nonce = ++commandNonce.current;
    const presets: Partial<Record<PanelSide, PanelPreset>> = {};
    const playback: Partial<Record<PanelSide, PlaybackCommand>> = {};
    const regions: EarthRegion[] = [];
    let nextView = { ...destination.camera };
    const ranges = { ...destination.colorRanges };
    const panelPreset = (side: PanelSide): PanelPreset => {
      if (presets[side]) return presets[side]!;
      const panel = destination.panels.find((entry) => entry.side === side);
      const variable =
        catalog.data!.variables.find((v) => v.id === panel?.variable) ??
        catalog.data!.variables.find(
          (v) => v.available !== false && v.months.length,
        )!;
      return {
        variable: variable.id,
        month:
          panel?.selectedMonth ??
          (side === "A"
            ? variable.months.at(-1)!.month
            : variable.months[0].month),
        region:
          panel?.region.id ??
          (finalTab === "compare"
            ? workspaceConfig.regions[0].id
            : globalStudyRegion.id),
        start: panel?.start,
        end: panel?.end,
        comparisonMode: panel?.comparisonMode,
        nonce,
      };
    };
    for (const action of actions) {
      if (action.type === "set_panel") {
        const previous = panelPreset(action.side);
        const variable = catalog.data.variables.find(
          (v) => v.id === action.variable,
        )!;
        const same = previous.variable === variable.id;
        presets[action.side] = {
          variable: action.variable,
          month: action.month,
          region: action.regionId ?? previous.region,
          start: action.start ?? (same ? previous.start : undefined),
          end: action.end ?? (same ? previous.end : undefined),
          comparisonMode: previous.comparisonMode,
          nonce,
        };
      }
      if (action.type === "set_camera")
        nextView = {
          ...nextView,
          longitude: Math.max(-180, Math.min(180, action.longitude)),
          latitude: Math.max(-90, Math.min(90, action.latitude)),
          zoom: Math.max(
            MIN_GLOBE_ZOOM,
            Math.min(MAX_GLOBE_ZOOM, action.zoom ?? nextView.zoom),
          ),
        };
      if (action.type === "set_range")
        ranges[action.variable] = {
          domain: [action.minimum, action.maximum],
          hideOutside: action.hideOutside,
        };
      if (action.type === "set_playback")
        playback[action.side] = { playing: action.playing, nonce };
      if (action.type === "set_area") {
        const bbox = parseStudyBbox(action.bbox)!;
        const region: EarthRegion = {
          id: `custom-${nonce}-${regions.length}`,
          name: action.name,
          bbox: bbox.join(","),
          longitude:
            ((((bbox[0] +
              (bbox[2] >= bbox[0]
                ? bbox[2] - bbox[0]
                : bbox[2] + 360 - bbox[0]) /
                2 +
              180) %
              360) +
              360) %
              360) -
            180,
          latitude: (bbox[1] + bbox[3]) / 2,
        };
        regions.push(region);
        presets.A = { ...panelPreset("A"), region: region.id, nonce };
        if (finalTab === "compare")
          presets.B = { ...panelPreset("B"), region: region.id, nonce };
        nextView = {
          ...nextView,
          longitude: region.longitude,
          latitude: region.latitude,
        };
      }
    }
    markChanged();
    workspace.setEventContext(undefined);
    for (const region of [...importedRegions, ...regions])
      workspace.registerRegion(region);
    if (Object.keys(presets).length)
      workspace.setPresets((previous) => ({ ...previous, ...presets }));
    if (Object.keys(playback).length)
      workspace.setPlaybackCommands((previous) => ({
        ...previous,
        ...playback,
      }));
    if (
      actions.some(
        (action) => action.type === "set_camera" || action.type === "set_area",
      )
    )
      workspace.camera.flyTo(nextView);
    workspace.setColorRanges(ranges);
    if (
      actions.some(
        (action) =>
          action.type === "set_area" ||
          (action.type === "set_panel" &&
            action.regionId &&
            workspace.eventContext &&
            action.regionId !== workspace.eventContext.region),
      )
    )
      workspace.setEventContext(undefined);
    setActive(finalTab);
    return [
      "View commands accepted. Panels will show loading status while observations are fetched.",
      snapshotNotice,
    ]
      .filter(Boolean)
      .join(" ");
  };
  const renderEventContext = (
    workspace: ReturnType<typeof useLabWorkspace>,
    compare: boolean,
  ) => {
    const event = workspace.eventContext;
    if (!event || !catalog.data) return null;
    const current = workspace.studies.A;
    const suggestions = event.suggestedVariables ?? [
      {
        id: event.variable,
        reason: "Monthly environmental context.",
        months: event.months,
        available: event.available,
      },
    ];
    return (
      <aside
        className="event-context-compact"
        aria-label="Event investigation context"
      >
        <div>
          <span className="eyebrow">EVENT PRESET · EDITABLE</span>
          <h2>{event.title}</h2>
          <p className="event-context-window">
            Event window: {realMonth(event.window[0])} –{" "}
            {realMonth(event.window[1])} · {event.location}
          </p>
          <details>
            <summary>Source and interpretation</summary>
            <p>{event.limitation}</p>
            <p>
              Monthly context does not detect the event or establish its causes.
              Adjacent periods can differ because of seasonality.{" "}
              <a href={event.source.url} target="_blank" rel="noreferrer">
                {event.source.name} <ExternalLink size={11} />
              </a>
            </p>
          </details>
        </div>
        <div className="event-context-tools">
          <small>
            Variables with overlapping catalog months; regional coverage is
            checked when loaded.
          </small>
          {suggestions.map((suggestion) => {
            const variable = catalog.data!.variables.find(
              (entry) => entry.id === suggestion.id,
            );
            return (
              <button
                key={suggestion.id}
                title={suggestion.reason}
                disabled={!suggestion.available}
                aria-pressed={current?.variable === suggestion.id}
                onClick={() => applyEvent(event, compare, suggestion.id)}
              >
                {variable?.name ?? suggestion.id}
              </button>
            );
          })}
          <button
            className="event-close"
            onClick={() => {
              markChanged();
              workspace.setEventContext(undefined);
            }}
          >
            Leave preset
          </button>
          <div className="event-phase-row">
            {(["A", ...(compare ? ["B"] : [])] as PanelSide[]).map((side) => {
              const study = workspace.studies[side];
              const variable = catalog.data!.variables.find(
                (entry) => entry.id === (study?.variable ?? event.variable),
              );
              if (!variable) return null;
              const phases = eventMonths(event, variable);
              return (
                <label key={side}>
                  {compare ? `Panel ${side}` : "View period"}
                  <select
                    aria-label={`Event period for panel ${side}`}
                    value=""
                    onChange={(change) => {
                      const selected = change.target.value as
                        "before" | "during" | "after";
                      const months = phases[selected];
                      if (!months?.length) return;
                      markChanged();
                      workspace.setPreset(side, {
                        variable: variable.id,
                        region: event.region,
                        start: months[0],
                        end: months.at(-1)!,
                        month: months.at(-1)!,
                        nonce: ++commandNonce.current,
                      });
                    }}
                  >
                    <option value="">Choose a phase…</option>
                    {(["before", "during", "after"] as const).map((phase) => (
                      <option
                        key={phase}
                        value={phase}
                        disabled={!phases[phase].length}
                      >
                        {phase[0].toUpperCase() + phase.slice(1)}
                        {phases[phase].length
                          ? ` · ${realMonth(phases[phase][0])} – ${realMonth(phases[phase].at(-1)!)}`
                          : " · no coverage"}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </div>
      </aside>
    );
  };
  return (
    <div className="app-shell immersive-space">
      <SpaceBackdrop fullScreen />
      <a className="skip-link" href="#main-content">
        Skip to investigation
      </a>
      <header className="site-header">
        <a
          href="#"
          className="brand"
          aria-label="KIPP home"
          onClick={(event) => {
            event.preventDefault();
            showTab("explore");
          }}
        >
          <span className="brand-mark">
            <Earth size={29} strokeWidth={1.25} />
            <i />
          </span>
          <span>
            KIPP<span className="brand-dot">.</span>
          </span>
        </a>
        <LabTabs active={active} onChange={showTab} />
      </header>
      <main id="main-content" className="workspace-main" tabIndex={-1}>
        <h1 className="sr-only">
          KIPP · {labTabs.find((tab) => tab.id === active)?.label}
        </h1>
        {(catalog.loading || config.loading) && (
          <p className="real-notice" role="status">
            Loading real variables and study areas…
          </p>
        )}
        {catalog.error && (
          <RequestFailure message={catalog.error} retry={catalog.retry} />
        )}
        {config.error && (
          <RequestFailure message={config.error} retry={config.retry} />
        )}
        {catalog.data && explorationConfig && comparisonConfig && (
          <>
            <section
              hidden={!isExploration}
              role="tabpanel"
              id="panel-explore"
              aria-labelledby="tab-explore"
              className="real-workspace"
            >
              {renderEventContext(exploration, false)}
              <div className="real-panels">
                <RealPanel
                  key="explore-A"
                  instanceId="explore-A"
                  overview
                  initialRegion={startingCountry.region}
                  initialOutline={startingCountry.geometry}
                  initializationKey={startingCountry.countryCode}
                  catalog={catalog.data}
                  config={explorationConfig}
                  side="A"
                  view={exploration.camera.view}
                  onView={exploration.changeView}
                  onNavigate={exploration.navigateView}
                  preset={exploration.presets.A}
                  active={isExploration}
                  colorRanges={exploration.colorRanges}
                  onColorRange={exploration.changeColorRange}
                  onSnapshot={exploration.receiveSnapshot}
                  onManualChange={markChanged}
                  playbackCommand={exploration.playbackCommands.A}
                  onPlaybackApplied={exploration.acknowledgePlayback}
                  onCustomRegion={exploration.registerRegion}
                  onAreaChange={() => exploration.setEventContext(undefined)}
                  eventWindow={exploration.eventContext?.window}
                />
              </div>
              <p className="real-method-note">
                The globe grid is aggregated for display. Regional series use
                source-grid points within the study rectangle; the global map
                stays visible. Check each variable’s method and quality.
              </p>
            </section>
            <section
              hidden={active !== "compare"}
              role="tabpanel"
              id="panel-compare"
              aria-labelledby="tab-compare"
              className="real-workspace"
            >
              <p className="real-comparison-note">
                Two globes share a camera, with independent filters. Matching
                variables use the same color scale. Different products and units
                require separate interpretation.
              </p>
              {renderEventContext(comparison, true)}
              <div className="real-panels is-comparing">
                {(["A", "B"] as PanelSide[]).map((side) => (
                  <RealPanel
                    key={`compare-${side}`}
                    instanceId={`compare-${side}`}
                    catalog={catalog.data!}
                    config={comparisonConfig}
                    side={side}
                    view={comparison.camera.view}
                    onView={comparison.changeView}
                    onNavigate={comparison.navigateView}
                    preset={comparison.presets[side]}
                    active={active === "compare"}
                    colorRanges={comparison.colorRanges}
                    onColorRange={comparison.changeColorRange}
                    onSnapshot={comparison.receiveSnapshot}
                    onManualChange={markChanged}
                    playbackCommand={comparison.playbackCommands[side]}
                    onPlaybackApplied={comparison.acknowledgePlayback}
                    onCustomRegion={comparison.registerRegion}
                    onAreaChange={() => comparison.setEventContext(undefined)}
                    eventWindow={comparison.eventContext?.window}
                  />
                ))}
              </div>
              <p className="real-method-note">
                Each regional series uses its own study rectangle. Visual
                comparisons and descriptive differences do not establish
                significance or causality.
              </p>
            </section>
            <section
              hidden={active !== "trend"}
              role="tabpanel"
              id="panel-trend"
              aria-labelledby="tab-trend"
            >
              <TrendLab
                onGuide={() => setModal("guide")}
                catalog={catalog.data}
                config={config.data!}
                initialCountry={startingCountry}
                active={active === "trend"}
              />
            </section>
            {active === "events" && (
              <section
                role="tabpanel"
                id="panel-events"
                aria-labelledby="tab-events"
              >
                <EventExplorer
                  catalog={catalog.data}
                  onOpen={applyEvent}
                  onExplore={() => showTab("explore")}
                />
              </section>
            )}
          </>
        )}
        {active === "learn" && (
          <section role="tabpanel" id="panel-learn" aria-labelledby="tab-learn">
            <Guide config={config.data} />
          </section>
        )}
        <p className="workspace-data-note">
          Real data derived from NASA products. The base image is static; the
          data layer represents its displayed month. Descriptive comparisons do
          not establish forecasts, event detection or causal attribution.
        </p>
        <footer className="site-footer">
          <a
            href="#"
            className="footer-brand"
            aria-label="KIPP home"
            onClick={(event) => {
              event.preventDefault();
              showTab("explore");
            }}
          >
            <Earth size={19} /> KIPP.
          </a>
          <span>Explore questions about our changing planet.</span>
          <div>
            <span>INDEPENDENT LAB</span>
            <span className="footer-dot" />
            NASA SPACE APPS · 2026
            <button onClick={() => setModal("sources")}>
              Credits & data <ArrowUpRight size={12} />
            </button>
            <button onClick={() => setModal("guide")}>
              <BookOpen size={12} /> Field guide
            </button>
            <button
              onClick={() => {
                markChanged();
                invalidateFrames();
                earthReadCache.clear();
                catalog.retry();
                config.retry();
              }}
            >
              <RefreshCw size={12} /> Refresh catalog
            </button>
          </div>
        </footer>
      </main>
      <div hidden={active === "trend"}>
        <Assistant
          ready={
            !!catalog.data &&
            !!config.data &&
            active !== "trend" &&
            (active === "compare" ? comparison.ready : exploration.ready)
          }
          getContext={getContext}
          applyResponse={applyAssistantResponse}
        />
      </div>
      {modal && (
        <Modal
          title={
            modal === "guide"
              ? "Your field guide"
              : "Sources, method & limitations"
          }
          onClose={() => setModal(null)}
          wide
        >
          {modal === "guide" ? (
            <Guide config={config.data} />
          ) : (
            <div className="real-source-modal">
              <p>
                Monthly fields are derived from NASA products and served by the
                lab’s data catalog. Each variable identifies its product, unit,
                aggregation and quality filters. The base image is static NASA
                Blue Marble imagery. The star field is decorative and does not
                represent astronomical positions or scientific observations.
              </p>
              <p>
                Event cards are curated and cite their historical sources. A
                coincidence between fields and events does not establish
                causality.
              </p>
              <p>
                KIPP mascot: AI-generated artwork inspired by the robot in
                Interstellar (2014), with a locally authored 3D animation.
                Created with OpenAI ImageGen, Codex, Three.js and FFmpeg. The
                mascot is not official film artwork; its screen graphics are
                decorative and do not represent scientific results.
              </p>
              {[
                ...new Set([
                  ...(catalog.data?.limitations ?? []),
                  ...(config.data?.limitations ?? []),
                ]),
              ].map((item) => (
                <p key={item}>{item}</p>
              ))}
              <p>
                Explore provenance under “Source, quality & limitations” and
                export the series JSON to preserve query metadata.
              </p>
              <a
                href="https://earthdata.nasa.gov/"
                target="_blank"
                rel="noreferrer"
              >
                NASA Earthdata <ExternalLink size={12} />
              </a>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
export default App;
