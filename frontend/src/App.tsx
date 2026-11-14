import { useCallback, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Database,
  Earth,
  ExternalLink,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { LabTabs } from "./components/LabTabs";
import type { LabTab } from "./components/LabTabs";
import { RealPanel } from "./components/RealDataView";
import { Modal } from "./components/Modal";
import { initialGlobeView } from "./lib/comparison";
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
function App() {
  const version = useRef(0);
  const commandNonce = useRef(0);
  const snapshots = useRef<Partial<Record<PanelSide, PanelSnapshot>>>({});
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const markChanged = useCallback(() => {
    version.current++;
  }, []);
  const receiveSnapshot = useCallback((snapshot: PanelSnapshot) => {
    if (
      JSON.stringify(snapshots.current[snapshot.side]) !==
      JSON.stringify(snapshot)
    ) {
      snapshots.current[snapshot.side] = snapshot;
      if (snapshot.side === "A") setHasSnapshot(true);
    }
  }, []);
  const [active, setActive] = useState<LabTab>("explore");
  const [view, setView] = useState(initialGlobeView);
  const changeView = (next: GlobeView) => {
    markChanged();
    setView(next);
  };
  const [colorRanges, setColorRanges] = useState<
    Record<string, EarthColorRange>
  >({});
  const changeColorRange = (variable: string, value?: EarthColorRange) => {
    markChanged();
    setColorRanges((previous) => {
      const next = { ...previous };
      if (value) next[variable] = value;
      else delete next[variable];
      return next;
    });
  };
  const [modal, setModal] = useState<"sources" | "guide" | null>(null);
  const [presetA, setPresetA] = useState<PanelPreset>();
  const [presetB, setPresetB] = useState<PanelPreset>();
  const [playbackCommands, setPlaybackCommands] = useState<
    Partial<Record<PanelSide, PlaybackCommand>>
  >({});
  const acknowledgePlayback = useCallback((side: PanelSide, nonce: number) => {
    setPlaybackCommands((previous) => {
      if (previous[side]?.nonce !== nonce) return previous;
      const next = { ...previous };
      delete next[side];
      return next;
    });
  }, []);
  const [customRegions, setCustomRegions] = useState<EarthRegion[]>([]);
  const [eventContext, setEventContext] = useState<EarthEvent>();
  const catalog = useEarthResource("catalog", loadCatalog);
  const config = useEarthResource("configuration", loadConfig);
  const workspaceConfig = config.data
    ? { ...config.data, regions: [...config.data.regions, ...customRegions] }
    : undefined;
  const live = useRef({ active, view, colorRanges });
  live.current = { active, view, colorRanges };
  const getContext = useCallback((): AssistantContext => {
    const state = live.current;
    const panels = [
      snapshots.current.A,
      ...(state.active === "compare" ? [snapshots.current.B] : []),
    ].filter((panel): panel is PanelSnapshot => !!panel);
    return structuredClone({
      version: version.current,
      tab: state.active,
      panels,
      camera: state.view,
      colorRanges: state.colorRanges,
    });
  }, []);
  const isWorkspace =
    active === "explore" || active === "compare" || active === "analysis";
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
    setPresetA({
      variable: event.variable,
      region: event.region,
      month: compare ? (before ?? during[0]) : during.at(-1)!,
    });
    setPresetB({
      variable: event.variable,
      region: event.region,
      month: compare
        ? during.at(-1)! === (before ?? during[0])
          ? (after ?? available.at(-1)!)
          : during.at(-1)!
        : (after ?? available.at(-1)!),
    });
    setEventContext(event);
    setView((current) => ({
      ...current,
      longitude: event.longitude,
      latitude: event.latitude,
    }));
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
    if (!catalog.data || !workspaceConfig)
      return "The catalog is unavailable. No commands applied.";
    const actions = validateAssistantActions(
      response.actions,
      catalog.data,
      workspaceConfig,
      current,
    );
    if (!actions)
      return "The proposed view commands could not be validated. No commands applied.";
    const nonce = ++commandNonce.current;
    const finalTab =
      actions.filter((action) => action.type === "set_tab").at(-1)?.tab ??
      current.tab;
    const presets: Partial<Record<PanelSide, PanelPreset>> = {};
    const playback: Partial<Record<PanelSide, PlaybackCommand>> = {};
    const regions: EarthRegion[] = [];
    let nextView = { ...current.camera };
    const ranges = { ...current.colorRanges };
    const panelPreset = (side: PanelSide): PanelPreset => {
      if (presets[side]) return presets[side]!;
      const panel = current.panels.find((entry) => entry.side === side);
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
        region: panel?.region.id ?? workspaceConfig.regions[0].id,
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
          longitude: (bbox[0] + bbox[2]) / 2,
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
    setEventContext(undefined);
    if (regions.length)
      setCustomRegions((previous) => [...previous, ...regions]);
    if (presets.A) setPresetA(presets.A);
    if (presets.B) setPresetB(presets.B);
    if (Object.keys(playback).length)
      setPlaybackCommands((previous) => ({ ...previous, ...playback }));
    setView(nextView);
    setColorRanges(ranges);
    setActive(finalTab);
    return [
      "View commands accepted. Panels will show loading status while observations are fetched.",
      snapshotNotice,
    ]
      .filter(Boolean)
      .join(" ");
  };
  const contextVariable = catalog.data?.variables.find(
    (entry) => entry.id === eventContext?.variable,
  );
  const contextMonths =
    contextVariable?.months
      .filter((entry) => entry.validSamples > 0)
      .map((entry) => entry.month) ?? [];
  const phases = eventContext
    ? [
        {
          label: "Antes",
          month: contextMonths
            .filter((month) => month < eventContext.window[0])
            .at(-1),
        },
        { label: "Durante", month: eventContext.months.at(-1) },
        {
          label: "Depois",
          month: contextMonths.find((month) => month > eventContext.window[1]),
        },
        { label: "Mais recente", month: contextMonths.at(-1) },
      ]
    : [];
  const titles: Record<LabTab, [string, string]> = {
    explore: ["A Terra,", "pelos dados."],
    compare: ["Duas perspectivas,", "o mesmo planeta."],
    events: ["A história deixa", "pistas."],
    analysis: ["Da observação", "à evidência."],
    learn: ["Curiosidade com", "método."],
  };
  const descriptions: Record<LabTab, string> = {
    explore:
      "Explore campos mensais derivados de produtos NASA. Escolha uma variável, gire o planeta e acompanhe um recorte ao longo do tempo.",
    compare:
      "Câmeras sincronizadas, variáveis e meses independentes. Compare campos reais em uma escala fixa por variável.",
    events:
      "Parta de um registro histórico e investigue seu contexto ambiental nos meses que o catálogo realmente oferece.",
    analysis:
      "Leia a série mensal regional, consulte produto, agregação e qualidade e exporte as observações com suas limitações.",
    learn:
      "Um guia para olhar, comparar e documentar observações da Terra sem extrapolar o que os dados permitem.",
  };
  return (
    <div className="app-shell">
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
          <span className="brand-divider" />
          <small>EARTH SYSTEMS LAB</small>
        </a>
        <nav className="desktop-nav" aria-label="Recursos do laboratório">
          <button onClick={() => setModal("sources")}>
            Fontes & ciência <ArrowUpRight size={12} />
          </button>
        </nav>
        <div className="header-right">
          <span className="prototype-badge">
            <i /> DADOS REAIS
          </span>
          <button
            className="field-guide-button"
            onClick={() => setModal("guide")}
          >
            <BookOpen size={15} /> Guia de campo <ArrowUpRight size={14} />
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <div className="real-intro unified-intro">
          <div>
            <span className="eyebrow">
              <Database size={14} /> OBSERVAR · COMPARAR · COMPREENDER
            </span>
            <h1>
              {titles[active][0]} <em>{titles[active][1]}</em>
            </h1>
            <p>{descriptions[active]}</p>
          </div>
          <div className="real-intro-actions">
            <button
              onClick={() => {
                markChanged();
                invalidateFrames();
                catalog.retry();
                config.retry();
              }}
            >
              <RefreshCw size={14} /> Atualizar catálogo
            </button>
            {catalog.data && (
              <span>
                {
                  catalog.data.variables.filter(
                    (entry) => entry.available !== false && entry.months.length,
                  ).length
                }{" "}
                variáveis com meses disponíveis
              </span>
            )}
          </div>
        </div>
        <LabTabs active={active} onChange={showTab} />
        <div className="real-disclosure">
          <i /> Dados reais derivados de produtos NASA · observação e comparação
          visual, sem previsão, detecção automática ou atribuição causal. A
          imagem de base do planeta é estática; a camada representa o mês
          indicado.
        </div>
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
        {catalog.data && workspaceConfig && (
          <>
            <section
              hidden={!isWorkspace}
              role="tabpanel"
              id={`panel-${isWorkspace ? active : "explore"}`}
              aria-labelledby={`tab-${isWorkspace ? active : "explore"}`}
              className={`real-workspace ${active === "analysis" ? "is-analysis" : ""}`}
            >
              {active === "compare" && (
                <p className="real-comparison-note">
                  Dois globos, câmera compartilhada. Filtros independentes. A
                  mesma variável mantém a mesma escala nos dois lados; produtos
                  e unidades diferentes devem ser interpretados separadamente.
                </p>
              )}
              {eventContext && (
                <aside className="real-event-context">
                  <div>
                    <span className="eyebrow">CONTEXTO HISTÓRICO</span>
                    <h2>{eventContext.title}</h2>
                    <p>{eventContext.limitation}</p>
                    <a
                      href={eventContext.source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Fonte: {eventContext.source.name}{" "}
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <div className="real-phase-controls">
                    {(
                      ["A", ...(active === "compare" ? ["B"] : [])] as (
                        "A" | "B"
                      )[]
                    ).map((side) => (
                      <label key={side}>
                        Mês do painel {side}
                        <select
                          aria-label={`Período do evento no painel ${side}`}
                          value=""
                          onChange={(event) => {
                            if (!event.target.value) return;
                            markChanged();
                            const preset = {
                              variable: eventContext.variable,
                              region: eventContext.region,
                              month: event.target.value,
                            };
                            (side === "A" ? setPresetA : setPresetB)(preset);
                          }}
                        >
                          <option value="">
                            Escolha um contexto disponível
                          </option>
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
                    <button onClick={() => setEventContext(undefined)}>
                      Limpar contexto
                    </button>
                  </div>
                </aside>
              )}
              <div
                className={`real-panels ${active === "compare" ? "is-comparing" : ""}`}
              >
                <RealPanel
                  catalog={catalog.data}
                  config={workspaceConfig}
                  side="A"
                  view={view}
                  onView={changeView}
                  preset={presetA}
                  active={isWorkspace}
                  colorRanges={colorRanges}
                  onColorRange={changeColorRange}
                  onSnapshot={receiveSnapshot}
                  onManualChange={markChanged}
                  playbackCommand={playbackCommands.A}
                  onPlaybackApplied={acknowledgePlayback}
                />
                {active === "compare" && (
                  <RealPanel
                    catalog={catalog.data}
                    config={workspaceConfig}
                    side="B"
                    view={view}
                    onView={changeView}
                    preset={presetB}
                    colorRanges={colorRanges}
                    onColorRange={changeColorRange}
                    onSnapshot={receiveSnapshot}
                    onManualChange={markChanged}
                    playbackCommand={playbackCommands.B}
                    onPlaybackApplied={acknowledgePlayback}
                    active
                  />
                )}
              </div>
              <p className="real-method-note">
                A grade do globo é agregada para visualização. A série regional
                usa os pontos da grade de origem dentro do bbox. Consulte o
                método e a qualidade específicos de cada variável. Não
                calculamos tendências ou significância a partir deste histórico
                curto.
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
          </div>
        </footer>
      </main>
      <Assistant
        ready={!!catalog.data && !!workspaceConfig && hasSnapshot}
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
                imagem de base é NASA Blue Marble, estática.
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
