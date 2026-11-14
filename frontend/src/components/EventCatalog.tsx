import { useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Columns2,
  ExternalLink,
  Flame,
  FlaskConical,
  MapPin,
  Search,
  Waves,
  Wind,
} from "lucide-react";
import { eventScenario, naturalEvents, phaseNames } from "../lib/events";
import type { EventCategory, EventPhase, NaturalEvent } from "../lib/events";
import type { Scenario } from "../lib/comparison";
import { formatMonth } from "../lib/playback";

const categories: EventCategory[] = [
  "Queimadas",
  "El Niño",
  "Furacões",
  "Tsunamis",
];
const icons = {
  Queimadas: Flame,
  "El Niño": Waves,
  Furacões: Wind,
  Tsunamis: Waves,
};

export function EventCatalog({
  onInvestigate,
  onCompare,
}: {
  onInvestigate: (scenario: Scenario) => void;
  onCompare: (scenario: Scenario) => void;
}) {
  const [category, setCategory] = useState<EventCategory | "Todos">("Todos");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(naturalEvents[0].id);
  const [phase, setPhase] = useState<EventPhase>("during");
  const detailRef = useRef<HTMLElement>(null);
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = naturalEvents.filter(
    (e) =>
      (category === "Todos" || category === e.category) &&
      normalize(`${e.title} ${e.location} ${e.category} ${e.dates}`).includes(
        normalize(query),
      ),
  );
  const event: NaturalEvent | undefined =
    filtered.find((e) => e.id === selected) ?? filtered[0];
  const scenario = event ? eventScenario(event, phase) : null;
  return (
    <div className="event-catalog">
      <div className="view-heading">
        <div>
          <span className="eyebrow">HISTÓRIAS REAIS. PERGUNTAS ABERTAS.</span>
          <h2>
            O planeta guarda <em>memórias.</em>
          </h2>
          <p>
            Escolha um evento, conheça o contexto e encontre uma pergunta para
            investigar.
          </p>
        </div>
        <span className="catalog-count">
          {naturalEvents.length.toString().padStart(2, "0")}
          <small>EVENTOS NO ACERVO</small>
        </span>
      </div>
      <div className="event-toolbar">
        <div
          className="category-filters"
          role="group"
          aria-label="Tipo de evento"
        >
          {(["Todos", ...categories] as const).map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="event-search">
          <Search size={15} />
          <input
            type="search"
            placeholder="Buscar evento ou lugar"
            aria-label="Buscar evento ou lugar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="catalog-notice">
        <FlaskConical size={17} />
        <p>
          <strong>Eventos reais, exploração simulada.</strong> As fontes
          documentam a história. Os presets apenas selecionam datas e regiões de
          séries inventadas; não reconstituem o evento.
        </p>
      </div>
      {event ? (
        <div className="event-layout">
          <div className="event-list" aria-label="Eventos históricos">
            {filtered.map((item) => {
              const Icon = icons[item.category];
              return (
                <button
                  key={item.id}
                  className={`event-card ${item.id === event.id ? "selected" : ""}`}
                  aria-pressed={item.id === event.id}
                  onClick={() => {
                    setSelected(item.id);
                    setPhase("during");
                    if (window.matchMedia("(max-width: 760px)").matches) {
                      requestAnimationFrame(() =>
                        detailRef.current?.scrollIntoView({ block: "start" }),
                      );
                    }
                  }}
                >
                  <div
                    className={`event-symbol event-${item.category === "Queimadas" ? "fire" : item.category === "El Niño" ? "enso" : "ocean"}`}
                  >
                    <Icon size={30} strokeWidth={1} />
                    <span>{item.dates}</span>
                  </div>
                  <div className="event-card-copy">
                    <span className="eyebrow">{item.category}</span>
                    <h3>{item.title}</h3>
                    <p>{item.location}</p>
                    <small>
                      {item.preset
                        ? "Preset educativo disponível"
                        : "Ficha histórica · camadas pendentes"}
                    </small>
                  </div>
                  <ArrowRight size={16} />
                </button>
              );
            })}
          </div>
          <article
            ref={detailRef}
            className="event-detail"
            aria-label="Detalhes do evento"
          >
            <span className="eyebrow">
              {event.category} · {event.dates}
            </span>
            <h3>{event.title}</h3>
            <p className="event-location">
              <MapPin size={13} />
              {event.location}
            </p>
            <p className="event-description">{event.description}</p>
            <blockquote>{event.question}</blockquote>
            <span className="section-label">
              CAMADAS PARA INVESTIGAR O FENÔMENO
            </span>
            <div className="event-layers">
              {event.layers.map((layer) => (
                <span key={layer}>{layer}</span>
              ))}
            </div>
            {event.preset && (
              <div className="event-phase">
                <span className="section-label">
                  <CalendarDays size={13} /> JANELA EDUCATIVA
                </span>
                <div role="group" aria-label="Fase do recorte">
                  {(["before", "during", "after"] as const).map((p) => (
                    <button
                      key={p}
                      aria-pressed={phase === p}
                      onClick={() => setPhase(p)}
                    >
                      {phaseNames[p]}
                    </button>
                  ))}
                </div>
                {scenario && (
                  <p>
                    {formatMonth(scenario.timeline.start)} —{" "}
                    {formatMonth(scenario.timeline.end)}
                    <small>
                      Janelas com a mesma duração; o recorte não define o início
                      ou fim exato do fenômeno.
                    </small>
                  </p>
                )}
              </div>
            )}
            <div className="event-limitation">
              <FlaskConical size={16} />
              <p>{event.limitation}</p>
            </div>
            {scenario ? (
              <div className="event-actions">
                <button
                  className="primary-button"
                  onClick={() => onInvestigate(scenario)}
                >
                  Explorar simulação
                  <ArrowRight size={15} />
                </button>
                <button
                  className="secondary-button"
                  onClick={() => onCompare(scenario)}
                >
                  <Columns2 size={15} />
                  Comparar recortes
                </button>
              </div>
            ) : (
              <p className="event-unavailable">
                Exploração indisponível até integrar a região e as camadas deste
                evento.
              </p>
            )}
            <a
              className="event-source"
              href={event.source.url}
              target="_blank"
              rel="noreferrer"
            >
              Fonte histórica: {event.source.name}
              <ExternalLink size={13} />
            </a>
          </article>
        </div>
      ) : (
        <div className="empty-events">
          <Search size={28} />
          <h3>Nenhum evento encontrado.</h3>
          <p>Experimente outro lugar, nome ou tipo de fenômeno.</p>
          <button
            className="secondary-button"
            onClick={() => {
              setQuery("");
              setCategory("Todos");
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
