import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Earth,
  ExternalLink,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { LabTabs, labTabs } from "./components/LabTabs";
import type { LabTab } from "./components/LabTabs";
import { RealPanel } from "./components/RealDataView";
import { SpaceBackdrop } from "./components/SpaceBackdrop";
import { useCountryLocation } from "./lib/useCountryLocation";
import { brazilCountry } from "./lib/countries";
import type { CountrySelection } from "./lib/countries";
import "./country-location.css";
import { Modal } from "./components/Modal";
import { initialGlobeView } from "./lib/comparison";
import { useGlobeCamera } from "./lib/useGlobeCamera";
import { loadCatalog, loadConfig, loadEvents, realMonth } from "./lib/earthApi";
import type {
  EarthCatalog,
  EarthColorRange,
  EarthConfig,
  EarthEvent,
} from "./lib/earthApi";
import { useEarthResource } from "./lib/useEarthResource";
import { invalidateFrames } from "./lib/earthFrameCache";
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
        <RefreshCw size={14} /> Tentar novamente
      </button>
    </div>
  );
}
const guide = [
  {
    title: "Escolha um sinal e um lugar",
    text: "As variáveis e os meses vêm do catálogo da API. O produto, a unidade e os filtros de qualidade acompanham a seleção. Os recortes são retângulos de estudo.",
  },
  {
    title: "Observe o mês que está na tela",
    text: "Ao buscar outro mês, o globo mantém o último quadro compatível até o próximo estar pronto. A data sobre o globo identifica o campo exibido. A reprodução prepara os próximos meses e aguarda a fonte quando necessário.",
  },
  {
    title: "Compare com contexto",
    text: "Dois globos compartilham a câmera e mantêm filtros independentes. A mesma variável usa a mesma escala. Produtos, processamentos e grandezas diferentes exigem interpretação própria.",
  },
  {
    title: "Leia o método antes da conclusão",
    text: "Médias ponderadas, somas e classes predominantes respondem a perguntas diferentes. Ausência de dado não significa zero. Uma sequência curta de meses não sustenta, por si só, uma tendência climática.",
  },
  {
    title: "Leve as evidências",
    text: "Exporte a série regional em CSV ou o registro completo em JSON, com produto, método, cobertura e qualidade. As fichas históricas oferecem contexto documental; o laboratório não detecta eventos nem atribui suas causas.",
  },
];
function Guide({ config }: { config?: EarthConfig }) {
  return (
    <div className="real-guide-grid">
      {guide.map((step, index) => (
        <article className="real-info-card" key={step.title}>
          <span className="eyebrow">0{index + 1} · GUIA DE CAMPO</span>
          <h2>{step.title}</h2>
          <p>{step.text}</p>
        </article>
      ))}
      <article className="real-info-card">
        <ShieldCheck size={21} />
        <h2>O alcance desta investigação</h2>
        {config?.limitations.map((limitation) => (
          <p key={limitation}>{limitation}</p>
        ))}
      </article>
    </div>
  );
}
function EventCards({
  catalog,
  onOpen,
}: {
  catalog: EarthCatalog;
  onOpen: (event: EarthEvent, compare: boolean) => void;
}) {
  const resource = useEarthResource("historical-events", loadEvents);
  return (
    <>
      <div className="real-disclosure">
        <i /> Catálogo histórico curado pela API. As fichas não são eventos
        detectados nestes campos. Disponibilidade significa sobreposição com os
        meses válidos da variável sugerida.
      </div>
      {resource.loading && (
        <p className="real-notice" role="status">
          Consultando eventos e disponibilidade…
        </p>
      )}
      {resource.error && (
        <RequestFailure message={resource.error} retry={resource.retry} />
      )}
      <div className="real-event-grid">
        {resource.data?.events.map((event) => {
          const variable = catalog.variables.find(
            (entry) => entry.id === event.variable,
          );
          const available = event.available && !!variable?.months.length;
          return (
            <article
              className={`real-event-card ${available ? "" : "is-unavailable"}`}
              key={event.id}
            >
              <span className="eyebrow">
                {event.category} ·{" "}
                {available ? "DADOS DISPONÍVEIS" : "FORA DA COBERTURA"}
              </span>
              <h2>{event.title}</h2>
              <p className="real-event-place">
                <MapPin size={13} /> {event.location}
              </p>
              <p>
                {realMonth(event.window[0])} — {realMonth(event.window[1])}
              </p>
              <p>{event.description}</p>
              <p className="real-event-limit">{event.limitation}</p>
              {available ? (
                <p className="real-grid-info">
                  {event.months.length} meses válidos na janela ·{" "}
                  {variable?.name} · {variable?.product}
                </p>
              ) : (
                <p className="real-event-unavailable">
                  {event.unavailableReason ??
                    "Sem meses válidos neste período."}
                </p>
              )}
              <a href={event.source.url} target="_blank" rel="noreferrer">
                {event.source.name} <ExternalLink size={12} />
              </a>
              <div className="real-event-actions">
                <button
                  disabled={!available}
                  onClick={() => onOpen(event, false)}
                >
                  Explorar contexto
                </button>
                <button
                  disabled={!available || (variable?.months.length ?? 0) < 2}
                  onClick={() => onOpen(event, true)}
                >
                  Comparar meses
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
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
    (tab: LabTab, version: number): AssistantContext => {
      const panels = [
        snapshots.current.A,
        ...(tab === "compare" ? [snapshots.current.B] : []),
      ].filter((panel): panel is PanelSnapshot => !!panel);
      return structuredClone({
        version,
        tab,
        panels,
        camera: live.current.view,
        colorRanges: live.current.colorRanges,
      });
    },
    [],
  );
  return {
    camera,
    ready,
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
    changeColorRange,
    getContext,
  };
}

function App() {
  const version = useRef(0);
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
    const panel = exploration.getContext("explore", version.current).panels[0];
    if (panel)
      exploration.setPreset("A", {
        variable: panel.variable,
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
    (tab: LabTab) =>
      (tab === "compare" ? comparison : exploration).getContext(
        tab,
        version.current,
      ),
    [comparison.getContext, exploration.getContext],
  );
  const getContext = useCallback(
    () => getWorkspaceContext(activeTab.current),
    [getWorkspaceContext],
  );
  const isExploration = active === "explore" || active === "analysis";
  const showTab = (tab: LabTab) => {
    markChanged();
    setActive(tab);
    requestAnimationFrame(() =>
      document.getElementById(`tab-${tab}`)?.focus({ preventScroll: true }),
    );
  };
  const applyEvent = (event: EarthEvent, compare: boolean) => {
    const variable = catalog.data?.variables.find(
      (entry) => entry.id === event.variable,
    );
    if (!event.available || !variable) return;
    const available = variable.months
      .filter((entry) => entry.validSamples > 0)
      .map((entry) => entry.month);
    const during = event.months.filter((month) => available.includes(month));
    if (!during.length) return;
    markChanged();
    const before = available.filter((month) => month < event.window[0]).at(-1);
    const after = available.find((month) => month > event.window[1]);
    const workspace = compare ? comparison : exploration;
    workspace.setPreset("A", {
      variable: event.variable,
      region: event.region,
      month: compare ? (before ?? during[0]) : during.at(-1)!,
    });
    if (compare)
      workspace.setPreset("B", {
        variable: event.variable,
        region: event.region,
        month:
          during.at(-1)! === (before ?? during[0])
            ? (after ?? available.at(-1)!)
            : during.at(-1)!,
      });
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
          nonce,
        };
      }
      if (action.type === "set_camera")
        nextView = {
          ...nextView,
          longitude: Math.max(-180, Math.min(180, action.longitude)),
          latitude: Math.max(-90, Math.min(90, action.latitude)),
          zoom: Math.max(0.8, Math.min(1.8, action.zoom ?? nextView.zoom)),
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
    if (!event) return null;
    const months =
      catalog.data?.variables
        .find((entry) => entry.id === event.variable)
        ?.months.filter((entry) => entry.validSamples > 0)
        .map((entry) => entry.month) ?? [];
    const phases = [
      {
        label: "Antes",
        month: months.filter((month) => month < event.window[0]).at(-1),
      },
      { label: "Durante", month: event.months.at(-1) },
      {
        label: "Depois",
        month: months.find((month) => month > event.window[1]),
      },
      { label: "Mais recente", month: months.at(-1) },
    ];
    return (
      <aside className="real-event-context">
        <div>
          <span className="eyebrow">CONTEXTO HISTÓRICO</span>
          <h2>{event.title}</h2>
          <p>{event.limitation}</p>
          <a href={event.source.url} target="_blank" rel="noreferrer">
            Fonte: {event.source.name} <ExternalLink size={11} />
          </a>
        </div>
        <div className="real-phase-controls">
          {(["A", ...(compare ? ["B"] : [])] as PanelSide[]).map((side) => (
            <label key={side}>
              Mês do painel {side}
              <select
                aria-label={`Período do evento no painel ${side}`}
                value=""
                onChange={(change) => {
                  if (!change.target.value) return;
                  markChanged();
                  workspace.setPreset(side, {
                    variable: event.variable,
                    region: event.region,
                    month: change.target.value,
                  });
                }}
              >
                <option value="">Escolha um contexto disponível</option>
                {phases.map((phase) => (
                  <option
                    key={phase.label}
                    value={phase.month ?? ""}
                    disabled={!phase.month}
                  >
                    {phase.label}
                    {phase.month
                      ? ` · ${realMonth(phase.month)}`
                      : " · sem mês disponível"}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button onClick={() => workspace.setEventContext(undefined)}>
            Limpar contexto
          </button>
        </div>
      </aside>
    );
  };
  return (
    <div className="app-shell immersive-space">
      <SpaceBackdrop fullScreen />
      <a className="skip-link" href="#main-content">
        Pular para a investigação
      </a>
      <header className="site-header">
        <a
          href="#"
          className="brand"
          aria-label="KIPP, início"
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
        {active === "explore" && (
          <div className="country-location-note">
            <p role="status" aria-live="polite">
              {location.status === "locating"
                ? `Choose whether to share location in your browser. ${startingCountry.name} is shown while waiting.`
                : location.status === "detected"
                  ? location.country.countryCode === startingCountry.countryCode
                    ? `Starting country: ${startingCountry.name}. Device coordinates stay in your browser.`
                    : `Country found: ${location.country.name}. Your current selection was preserved.`
                  : location.status === "denied"
                    ? `Location not shared. Starting country: ${startingCountry.name}.`
                    : `Country could not be determined. Starting country: ${startingCountry.name}.`}
            </p>
            <div>
              {location.status === "detected" && (
                <button
                  type="button"
                  onClick={() => applyCountry(location.country)}
                >
                  Use {location.country.name}
                </button>
              )}
              {location.status !== "locating" && (
                <button
                  type="button"
                  onClick={() => {
                    locationVersion.current = version.current;
                    location.requestLocation();
                  }}
                >
                  Use my location
                </button>
              )}
            </div>
          </div>
        )}
        {(catalog.loading || config.loading) && (
          <p className="real-notice" role="status">
            Conectando ao catálogo e às regiões de estudo…
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
              id={`panel-${active === "analysis" ? "analysis" : "explore"}`}
              aria-labelledby={`tab-${active === "analysis" ? "analysis" : "explore"}`}
              className={`real-workspace ${active === "analysis" ? "is-analysis" : ""}`}
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
                  preset={exploration.presets.A}
                  active={isExploration}
                  colorRanges={exploration.colorRanges}
                  onColorRange={exploration.changeColorRange}
                  onSnapshot={exploration.receiveSnapshot}
                  onManualChange={markChanged}
                  playbackCommand={exploration.playbackCommands.A}
                  onPlaybackApplied={exploration.acknowledgePlayback}
                  onCustomRegion={exploration.registerRegion}
                />
              </div>
              <p className="real-method-note">
                A grade do globo é agregada para visualização. A série regional
                usa os pontos da grade de origem dentro do retângulo
                selecionado. A camada global permanece visível. Consulte o
                método e a qualidade de cada variável.
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
                Dois globos, câmera compartilhada. Filtros independentes. A
                mesma variável mantém a mesma escala nos dois lados; produtos e
                unidades diferentes devem ser interpretados separadamente.
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
                    preset={comparison.presets[side]}
                    active={active === "compare"}
                    colorRanges={comparison.colorRanges}
                    onColorRange={comparison.changeColorRange}
                    onSnapshot={comparison.receiveSnapshot}
                    onManualChange={markChanged}
                    playbackCommand={comparison.playbackCommands[side]}
                    onPlaybackApplied={comparison.acknowledgePlayback}
                    onCustomRegion={comparison.registerRegion}
                  />
                ))}
              </div>
              <p className="real-method-note">
                A grade do globo é agregada para visualização. Cada série
                regional usa seu próprio retângulo. Comparação visual e
                diferenças descritivas não estabelecem significância ou
                causalidade.
              </p>
            </section>
            {active === "events" && (
              <section
                role="tabpanel"
                id="panel-events"
                aria-labelledby="tab-events"
              >
                <EventCards catalog={catalog.data} onOpen={applyEvent} />
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
          Dados reais derivados de produtos NASA. A imagem de base é estática; a
          camada representa o mês indicado. Comparações descritivas não
          estabelecem previsão, detecção automática ou atribuição causal.
        </p>
        <footer className="site-footer">
          <a
            href="#"
            className="footer-brand"
            onClick={(event) => {
              event.preventDefault();
              showTab("explore");
            }}
          >
            <Earth size={19} /> KIPP.
          </a>
          <span>Feito para cultivar curiosidade sobre o nosso planeta.</span>
          <div>
            <span>LABORATÓRIO INDEPENDENTE</span>
            <span className="footer-dot" />
            NASA SPACE APPS · 2026
            <button onClick={() => setModal("sources")}>
              Créditos & dados <ArrowUpRight size={12} />
            </button>
            <button onClick={() => setModal("guide")}>
              <BookOpen size={12} /> Guia de campo
            </button>
            <button
              onClick={() => {
                markChanged();
                invalidateFrames();
                catalog.retry();
                config.retry();
              }}
            >
              <RefreshCw size={12} /> Atualizar catálogo
            </button>
          </div>
        </footer>
      </main>
      <Assistant
        ready={
          !!catalog.data &&
          !!config.data &&
          (active === "compare" ? comparison.ready : exploration.ready)
        }
        getContext={getContext}
        applyResponse={applyAssistantResponse}
      />
      {modal && (
        <Modal
          title={
            modal === "guide" ? "Seu guia de campo" : "Fontes, método & limites"
          }
          onClose={() => setModal(null)}
          wide
        >
          {modal === "guide" ? (
            <Guide config={config.data} />
          ) : (
            <div className="real-source-modal">
              <p>
                Os campos mensais são derivados de produtos NASA e servidos pelo
                catálogo de dados do laboratório. Cada variável identifica o
                produto, a unidade, a agregação e os filtros de qualidade. A
                imagem de base é NASA Blue Marble, estática. O fundo estrelado é
                uma ambientação decorativa, sem representar posições
                astronômicas ou observações científicas.
              </p>
              <p>
                As fichas de eventos são curadas e citam suas fontes históricas.
                Uma coincidência entre campos e eventos não demonstra
                causalidade.
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
                Explore a proveniência em “Fonte, qualidade & limites” e exporte
                o JSON da série para preservar os metadados da consulta.
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
