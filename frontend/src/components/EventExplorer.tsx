import { useState } from "react";
import { ArrowRight, ExternalLink, Search } from "lucide-react";
import { loadEvents, realMonth, realUnit } from "../lib/earthApi";
import type { EarthCatalog, EarthEvent } from "../lib/earthApi";
import { useEarthResource } from "../lib/useEarthResource";
import "../event-investigations.css";

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
  const matches =
    resource.data?.events.filter(
      (event) =>
        (showAll || event.available) &&
        `${event.title} ${event.category} ${event.location}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(
            query
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase(),
          ),
    ) ?? [];
  return (
    <div className="event-explorer">
      <div className="event-explorer-intro">
        <p>
          <strong>Start with a case.</strong> Presets suggest a place, period
          and environmental variables. Every selection stays editable.
        </p>
        <button onClick={onExplore}>
          Explore freely <ArrowRight size={14} />
        </button>
      </div>
      <div className="event-search-row">
        <label>
          <Search size={16} />
          <input
            aria-label="Find an event"
            placeholder="Find an event or place…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="event-all-toggle">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />{" "}
          Include cases outside current data coverage
        </label>
      </div>
      {resource.loading && (
        <p role="status">Checking event presets and actual catalog coverage…</p>
      )}
      {resource.error && (
        <div role="alert" className="real-error">
          <p>{resource.error}</p>
          <button onClick={resource.retry}>Retry event catalog</button>
        </div>
      )}
      {!resource.loading && !resource.error && !matches.length && (
        <p>
          No matching cases. Try another search or explore your own place and
          period.
        </p>
      )}
      <div className="event-case-grid">
        {matches.map((event) => {
          const suggestions = event.suggestedVariables ?? [
            {
              id: event.variable,
              reason:
                "Monthly environmental context for this place and period.",
              months: event.months,
              available: event.available,
            },
          ];
          const usable = suggestions.filter((s) => s.available);
          return (
            <article className="event-case" key={event.id}>
              <div className="event-case-meta">
                <span>{event.category}</span>
                <span>
                  {event.available
                    ? "Context data available"
                    : "Outside current coverage"}
                </span>
              </div>
              <h2>{event.title}</h2>
              <p className="event-case-place">
                {event.location} · {realMonth(event.window[0])} –{" "}
                {realMonth(event.window[1])}
              </p>
              <p>{event.description}</p>
              <div className="event-clues">
                <h3>Variables to investigate</h3>
                {suggestions.map((s) => {
                  const variable = catalog.variables.find((v) => v.id === s.id);
                  return (
                    <button
                      key={s.id}
                      disabled={!s.available}
                      onClick={() => onOpen(event, false, s.id)}
                      title={s.reason}
                    >
                      <span>{variable?.name ?? s.id}</span>
                      <small>
                        {s.available
                          ? `${s.months.length} overlapping months · ${realUnit(variable?.unit ?? "")}`
                          : "No overlapping months"}
                      </small>
                    </button>
                  );
                })}
              </div>
              <details>
                <summary>What these data can tell us</summary>
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
                  These are monthly environmental observations or estimates
                  around a documented event. Catalog overlap does not guarantee
                  valid cells throughout this area. It does not establish causes
                  or detect the event.
                </p>
              </details>
              <div className="event-case-actions">
                <button
                  disabled={!usable.length}
                  onClick={() => onOpen(event, false, usable[0]?.id)}
                >
                  Explore this case <ArrowRight size={14} />
                </button>
                <button
                  disabled={!usable.length}
                  onClick={() => onOpen(event, true, usable[0]?.id)}
                >
                  Compare context
                </button>
                <a href={event.source.url} target="_blank" rel="noreferrer">
                  Source <ExternalLink size={12} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
      <p className="event-case-footnote">
        Have another question? Choose any area and available period in Explore.
        You only name an investigation when you decide to save it.
      </p>
    </div>
  );
}
