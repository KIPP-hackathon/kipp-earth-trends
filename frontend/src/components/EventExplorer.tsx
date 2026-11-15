import { useState } from "react";
import { LoadingIcon } from "./Loading";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CloudRain,
  Columns2,
  Compass,
  Droplets,
  ExternalLink,
  Gauge,
  Info,
  Leaf,
  MapPin,
  Search,
  SlidersHorizontal,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import { loadEvents } from "../lib/earthApi";
import type { EarthCatalog, EarthEvent } from "../lib/earthApi";
import { useEarthResource } from "../lib/useEarthResource";
import { EventArtwork, eventTheme, eventThemes } from "./EventArtwork";
import type { EventTheme } from "./EventArtwork";
import "../event-investigations.css";
import "./event-explorer.css";

const eventMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const eventMonth = (month: string) =>
  eventMonthFormatter.format(new Date(`${month}-01T00:00:00Z`));
const eventUnit = (unit: string) => (unit === "degC" ? "°C" : unit);

function variableVisual(id: string) {
  if (id === "rainfall") return { icon: CloudRain, tone: "rain" };
  if (id === "temperature") return { icon: Thermometer, tone: "heat" };
  if (/ndvi|evi/.test(id)) return { icon: Leaf, tone: "leaf" };
  if (/qv|humidity/.test(id)) return { icon: Droplets, tone: "water" };
  if (/u10m|v10m|wind/.test(id)) return { icon: Wind, tone: "wind" };
  if (/pressure|_ps$/.test(id)) return { icon: Gauge, tone: "pressure" };
  return { icon: SlidersHorizontal, tone: "wind" };
}
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function EventExplorer({
  catalog,
  onOpen,
  onExplore,
}: {
  catalog: EarthCatalog;
  onOpen: (event: EarthEvent, compare: boolean, variableId?: string) => void;
  onExplore: () => void;
}) {
  const resource = useEarthResource("historical-events", loadEvents);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [category, setCategory] = useState<EventTheme | "all">("all");
  const events = resource.data?.events ?? [];
  const categories = [
    ...new Set(events.map((event) => eventTheme(event.category))),
  ];
  const matches = events.filter(
    (event) =>
      (showAll || event.available) &&
      (category === "all" || category === eventTheme(event.category)) &&
      normalize(
        `${event.title} ${event.category} ${eventThemes[eventTheme(event.category)].label} ${event.location}`,
      ).includes(normalize(query.trim())),
  );
  const resetFilters = () => {
    setQuery("");
    setCategory("all");
  };

  return (
    <div className="event-explorer event-visual-preview">
      <header className="events-heading">
        <div>
          <span className="events-eyebrow">
            <Compass size={14} aria-hidden="true" /> THE EARTH, IN CONTEXT
          </span>
          <h2>
            Every event starts <em>a question.</em>
          </h2>
          <p>Discover a real-world case. Follow the environmental clues.</p>
        </div>
        <button className="events-free-explore" onClick={onExplore}>
          Explore freely <ArrowRight size={15} aria-hidden="true" />
        </button>
      </header>
      <div className="events-toolbar">
        <div className="events-toolbar-top">
          <div
            className="events-category-filters"
            role="group"
            aria-label="Event category"
          >
            <button
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
            >
              <Compass size={14} aria-hidden="true" /> All events
            </button>
            {categories.map((key) => {
              const { icon: Icon, label } = eventThemes[key];
              return (
                <button
                  key={key}
                  data-theme={key}
                  aria-pressed={category === key}
                  onClick={() => setCategory(key)}
                >
                  <Icon size={14} aria-hidden="true" /> {label}
                </button>
              );
            })}
          </div>
          <label className="events-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="Find an event"
              placeholder="Search events or places…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="events-toolbar-bottom">
          <span role="status" aria-live="polite" className={resource.loading ? "loading-status" : undefined}>
            {resource.loading && <LoadingIcon />}
            {resource.loading
              ? "Checking catalog coverage…"
              : resource.error
                ? "Catalog unavailable"
                : `${matches.length} ${matches.length === 1 ? "case" : "cases"} to discover`}
          </span>
          <label className="events-coverage-toggle">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(event) => setShowAll(event.target.checked)}
            />{" "}
            Include cases outside current data coverage
          </label>
        </div>
      </div>
      {resource.loading && (
        <div className="events-skeleton" aria-hidden="true">
          <div />
          <div />
        </div>
      )}
      {resource.error && (
        <div role="alert" className="real-error">
          <p>{resource.error}</p>
          <button onClick={resource.retry}>Retry event catalog</button>
        </div>
      )}
      {!resource.loading && !resource.error && !matches.length && (
        <div className="events-empty">
          <Search size={28} aria-hidden="true" />
          <h3>No cases found</h3>
          <p>
            Try a different event, place or category, or include cases outside
            current coverage.
          </p>
          <button onClick={resetFilters}>
            Clear search & category <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="event-case-grid">
        {matches.map((event) => {
          const theme = eventTheme(event.category);
          const { icon: Icon, label } = eventThemes[theme];
          const suggestions = event.suggestedVariables ?? [
            {
              id: event.variable,
              reason:
                "Monthly environmental context for this place and period.",
              months: event.months,
              available: event.available,
            },
          ];
          const usable = suggestions.filter(
            (suggestion) => suggestion.available,
          );
          const years = [
            ...new Set(event.window.map((month) => month.slice(0, 4))),
          ].join("–");
          return (
            <article
              className="event-case"
              data-theme={theme}
              key={event.id}
              aria-labelledby={`event-title-${event.id}`}
            >
              <div className="events-card-cover">
                <EventArtwork theme={theme} />
                <span className="events-category-badge">
                  <Icon size={14} aria-hidden="true" />{" "}
                  {theme === "other" ? event.category : label}
                </span>
                <span className="events-cover-year">{years}</span>
                <span className="events-cover-caption">
                  CONCEPTUAL ILLUSTRATION
                </span>
              </div>
              <div className="events-card-body">
                <div
                  className={`events-availability ${event.available ? "is-available" : "is-unavailable"}`}
                >
                  <span aria-hidden="true" />
                  {event.available
                    ? "Monthly context available"
                    : "Outside current coverage"}
                </div>
                <h2 id={`event-title-${event.id}`}>{event.title}</h2>
                <div className="events-location">
                  <span>
                    <MapPin size={13} aria-hidden="true" />
                    {event.location}
                  </span>
                  <span>
                    <CalendarDays size={13} aria-hidden="true" />
                    {eventMonth(event.window[0])} –{" "}
                    {eventMonth(event.window[1])}
                  </span>
                </div>
                <p className="events-description">{event.description}</p>
                <div className="event-clues">
                  <h3>
                    FOLLOW THE VARIABLES <span>{usable.length} available</span>
                  </h3>
                  <div className="events-variable-grid">
                    {suggestions.map((suggestion) => {
                      const variable = catalog.variables.find(
                        (item) => item.id === suggestion.id,
                      );
                      const { icon: VariableIcon, tone } = variableVisual(
                        suggestion.id,
                      );
                      return (
                        <button
                          key={suggestion.id}
                          className="events-variable"
                          disabled={!suggestion.available}
                          onClick={() => onOpen(event, false, suggestion.id)}
                          title={suggestion.reason}
                        >
                          <span
                            className="events-variable-icon"
                            data-tone={tone}
                          >
                            <VariableIcon
                              size={18}
                              strokeWidth={1.6}
                              aria-hidden="true"
                            />
                          </span>
                          <span className="events-variable-copy">
                            <span>{variable?.name ?? suggestion.id}</span>
                            <small>
                              {suggestion.available
                                ? `${suggestion.months.length} overlapping ${suggestion.months.length === 1 ? "month" : "months"} · ${eventUnit(variable?.unit ?? "")}`
                                : "No overlapping months"}
                            </small>
                          </span>
                          {suggestion.available ? (
                            <ChevronRight
                              className="events-variable-arrow"
                              size={14}
                              aria-hidden="true"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {!suggestions.length && (
                    <p className="events-no-variables">
                      No suitable environmental layers in the current catalog.
                    </p>
                  )}
                </div>
                <details className="events-data-details">
                  <summary>
                    <Info size={14} aria-hidden="true" /> What these data can
                    tell us <ChevronRight size={13} aria-hidden="true" />
                  </summary>
                  <p>{event.limitation}</p>
                  <ul>
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.id}>
                        <strong>
                          {catalog.variables.find(
                            (variable) => variable.id === suggestion.id,
                          )?.name ?? suggestion.id}
                        </strong>
                        : {suggestion.reason}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Monthly environmental observations or estimates around a
                    documented event. Catalog overlap does not guarantee valid
                    cells throughout this area, establish causes or detect the
                    event.
                  </p>
                </details>
                <div className="event-case-actions">
                  <button
                    className="events-open-case"
                    disabled={!usable.length}
                    onClick={() => onOpen(event, false, usable[0]?.id)}
                  >
                    Explore this case{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                  <button
                    className="events-compare-case"
                    disabled={!usable.length}
                    onClick={() => onOpen(event, true, usable[0]?.id)}
                  >
                    <Columns2 size={14} aria-hidden="true" /> Compare context
                  </button>
                </div>
                <div className="events-source-row">
                  <span>Curated historical case</span>
                  <a href={event.source.url} target="_blank" rel="noreferrer">
                    {event.source.name}{" "}
                    <ExternalLink size={11} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <aside className="events-context-note">
        <Info size={16} aria-hidden="true" />
        <p>
          <strong>A starting point, not a conclusion.</strong> Presets suggest a
          place, period and variables. Every selection stays editable. Monthly
          context does not detect events or establish their causes.
        </p>
      </aside>
    </div>
  );
}
