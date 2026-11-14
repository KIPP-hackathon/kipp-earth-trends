import { useEffect, useId, useState } from "react";
import type { Dispatch } from "react";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Copy,
  FlaskConical,
  Link2,
} from "lucide-react";
import { Globe } from "./Globe";
import { TimeSeries } from "./TimeSeries";
import { formatValue, makeSeries, regions, variables } from "../lib/analysis";
import type { RegionId, Variable } from "../lib/analysis";
import { comparisonTimeline, hasDateOverlap } from "../lib/comparison";
import type {
  ComparisonAction,
  ComparisonState,
  Side,
  TimeMode,
} from "../lib/comparison";
import {
  formatMonth,
  getSpatialFrame,
  monthInputValue,
  parseMonth,
  selectPeriod,
} from "../lib/playback";

export function ComparisonView({
  state,
  dispatch,
  active,
  onExplain,
}: {
  state: ComparisonState;
  dispatch: Dispatch<ComparisonAction>;
  active: boolean;
  onExplain: () => void;
}) {
  const [mobileSide, setMobileSide] = useState<Side>(0);
  const [showSeries, setShowSeries] = useState(false);
  const id = useId();
  const [a, b] = state.scenarios;
  useEffect(() => {
    if (!active) dispatch({ type: "pause" });
  }, [active, dispatch]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [dispatch]);
  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setInterval>[] = [];
    for (const side of [0, 1] as const) {
      const timeline = side === 0 ? a.timeline : b.timeline;
      if (timeline.playing && (state.timeMode === "independent" || side === 0))
        timers.push(
          setInterval(
            () =>
              dispatch({ type: "playback", side, action: { type: "tick" } }),
            500 / timeline.speed,
          ),
        );
    }
    return () => timers.forEach(clearInterval);
  }, [
    active,
    dispatch,
    a.timeline.playing,
    b.timeline.playing,
    a.timeline.speed,
    b.timeline.speed,
    state.timeMode,
  ]);
  const comparable = a.variable === b.variable && a.mode === b.mode;
  const mean = (side: Side) => {
    const s = state.scenarios[side];
    return getSpatialFrame(s.region, s.variable, s.timeline.frame, s.mode).mean;
  };
  return (
    <div className="comparison-view">
      <div className="view-heading">
        <div>
          <span className="eyebrow">DOIS OLHARES, NOVAS PERGUNTAS</span>
          <h2>
            Coloque suas hipóteses <em>lado a lado.</em>
          </h2>
          <p>
            Compare lugares, épocas ou sinais. Mude uma condição e acompanhe a
            diferença.
          </p>
        </div>
        <span className="simulation-tag">
          <FlaskConical size={14} /> Dados simulados · 2001–2024
        </span>
      </div>
      <div className="comparison-toolbar">
        <label htmlFor={`${id}-sync`}>
          <Link2 size={15} /> Tempo
          <select
            id={`${id}-sync`}
            value={state.timeMode}
            onChange={(e) =>
              dispatch({ type: "sync", mode: e.target.value as TimeMode })
            }
          >
            <option value="independent">Independente</option>
            <option value="date" disabled={!hasDateOverlap(state)}>
              Mesma data{!hasDateOverlap(state) ? " · sem período comum" : ""}
            </option>
            <option value="relative">Meses desde o início</option>
          </select>
        </label>
        <label className="check-control">
          <input
            type="checkbox"
            checked={state.linkedView}
            onChange={(e) =>
              dispatch({
                type: "link-view",
                linked: e.target.checked,
                side: mobileSide,
              })
            }
          />{" "}
          Vincular rotação, zoom e camada
        </label>
        <button
          className="text-button"
          aria-expanded={showSeries}
          onClick={() => setShowSeries((v) => !v)}
        >
          <ChartNoAxesCombined size={15} />
          {showSeries ? "Ocultar séries" : "Mostrar séries"}
        </button>
      </div>
      <p className="comparison-sync-note" role="status">
        {state.timeMode === "date"
          ? `Reprodução no período comum: ${formatMonth(comparisonTimeline(state, 0).start)} — ${formatMonth(comparisonTimeline(state, 0).end)}.`
          : state.timeMode === "relative"
            ? "Os inícios estão alinhados. A reprodução termina com o período mais curto; as datas de cada lado podem ser diferentes."
            : "Cada cenário tem seu próprio relógio. Para comparar a mesma data, escolha períodos que se sobreponham."}
      </p>
      <div
        className="mobile-scenario-switch"
        role="group"
        aria-label="Cenário em exibição no celular"
      >
        {([0, 1] as const).map((side) => (
          <button
            key={side}
            aria-pressed={mobileSide === side}
            onClick={() => setMobileSide(side)}
          >
            Cenário {side === 0 ? "A" : "B"}
          </button>
        ))}
      </div>
      <div className="comparison-grid">
        {([0, 1] as const).map((side) => {
          const s = state.scenarios[side],
            letter = side === 0 ? "A" : "B";
          const reference = makeSeries(s.region, s.variable);
          return (
            <section
              key={side}
              className="scenario"
              data-mobile-active={mobileSide === side}
              aria-label={`Cenário ${letter}`}
            >
              <div className="scenario-title">
                <span
                  className={`scenario-letter side-${letter.toLowerCase()}`}
                >
                  {letter}
                </span>
                <div>
                  <h3>{regions.find((r) => r.id === s.region)!.name}</h3>
                  <p>{s.context ?? "Investigação livre · dados simulados"}</p>
                </div>
                <button
                  className="scenario-copy"
                  onClick={() => dispatch({ type: "duplicate", side })}
                  aria-label={`Copiar cenário ${letter} para ${side === 0 ? "B" : "A"}`}
                  title={`Copiar ${letter} para ${side === 0 ? "B" : "A"}`}
                >
                  <Copy size={14} />
                  <span>
                    {letter}
                    <ArrowRight size={10} />
                    {side === 0 ? "B" : "A"}
                  </span>
                </button>
              </div>
              <div className="scenario-filters">
                <label>
                  Região
                  <select
                    aria-label={`Região do cenário ${letter}`}
                    value={s.region}
                    onChange={(e) =>
                      dispatch({
                        type: "filter",
                        side,
                        patch: { region: e.target.value as RegionId },
                      })
                    }
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Variável
                  <select
                    aria-label={`Variável do cenário ${letter}`}
                    value={s.variable}
                    onChange={(e) =>
                      dispatch({
                        type: "filter",
                        side,
                        patch: { variable: e.target.value as Variable },
                      })
                    }
                  >
                    {(Object.keys(variables) as Variable[]).map((v) => (
                      <option key={v} value={v}>
                        {variables[v].short}
                      </option>
                    ))}
                  </select>
                </label>
                {(["start", "end"] as const).map((bound) => (
                  <label key={bound}>
                    {bound === "start" ? "De" : "Até"}
                    <input
                      type="month"
                      min="2001-01"
                      max="2024-12"
                      aria-label={`${bound === "start" ? "Mês inicial" : "Mês final"} do cenário ${letter}`}
                      value={monthInputValue(s.timeline[bound])}
                      onChange={(e) => {
                        const index = parseMonth(e.target.value);
                        if (index !== null)
                          dispatch({
                            type: "playback",
                            side,
                            action: { type: "range", bound, index },
                          });
                      }}
                    />
                  </label>
                ))}
              </div>
              <Globe
                region={s.region}
                variable={s.variable}
                mode={s.mode}
                timeline={comparisonTimeline(state, side)}
                view={s.view}
                onRegion={(region) =>
                  dispatch({ type: "filter", side, patch: { region } })
                }
                onModeChange={(mode) =>
                  dispatch({ type: "filter", side, patch: { mode } })
                }
                onAction={(action) =>
                  dispatch({ type: "playback", side, action })
                }
                onViewChange={(view) => dispatch({ type: "view", side, view })}
              />
              {showSeries && (
                <TimeSeries
                  series={selectPeriod(reference, s.timeline)}
                  reference={reference}
                  frame={s.timeline.frame}
                  variable={s.variable}
                  deseasonalized={s.mode === "anomaly"}
                  onFrame={(frame) =>
                    dispatch({
                      type: "playback",
                      side,
                      action: { type: "seek", frame },
                    })
                  }
                  onDeseasonalize={() =>
                    dispatch({
                      type: "filter",
                      side,
                      patch: {
                        mode: s.mode === "anomaly" ? "absolute" : "anomaly",
                      },
                    })
                  }
                  onExplain={onExplain}
                />
              )}
            </section>
          );
        })}
      </div>
      <div className="comparison-summary">
        <div>
          <span className="eyebrow">LEIA AS DIFERENÇAS</span>
          <h3>
            {comparable
              ? "Uma escala comum para os dois cenários."
              : "Cada variável tem sua própria unidade."}
          </h3>
          <p>
            {comparable
              ? "Cores com escala fixa; anomalias usam a referência mensal 2001–2024. Compare também os meses e as estações."
              : "Troque a variável e o modo para comparar valores na mesma escala. Não calculamos diferenças entre unidades distintas."}
          </p>
        </div>
        {comparable && (
          <div className="comparison-difference">
            <span>B − A · mês em exibição</span>
            <strong>
              {formatValue(mean(1) - mean(0), a.variable, true)}{" "}
              <small>{variables[a.variable].unit}</small>
            </strong>
            <small>Diferença entre médias simuladas</small>
          </div>
        )}
      </div>
      <p className="data-footnote">
        Semelhanças visuais ajudam a formular perguntas. Este protótipo não
        calcula similaridade entre eventos, não usa observações atuais e não
        prevê fenômenos.
      </p>
    </div>
  );
}
