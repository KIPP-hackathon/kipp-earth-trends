import { useMemo, useState } from "react";
import { Flag, MapPin, CalendarDays } from "lucide-react";
import { loadEvents } from "../lib/earthApi";
import type { EarthCatalog, EarthEvent, EarthRegion } from "../lib/earthApi";
import type { CountrySelection } from "../lib/countries";
import { buildStudyAreas } from "../lib/studyAreas";
import { SearchPicker } from "./ExplorationControls";
import { useEarthResource } from "../lib/useEarthResource";
import "./study-area-picker.css";
import "./multivariable-layers.css";

const groups = [
  { id: "country", label: "Countries", icon: Flag },
  { id: "place", label: "Places", icon: MapPin },
  { id: "event", label: "Events", icon: CalendarDays },
];

export function StudyAreaPicker({
  id,
  current,
  countries,
  regions,
  onChange,
  catalog,
  currentEvent,
  onEvent,
}: {
  id: string;
  current: EarthRegion;
  countries: CountrySelection[];
  regions: EarthRegion[];
  onChange: (region: EarthRegion) => void;
  catalog: EarthCatalog;
  currentEvent?: EarthEvent;
  onEvent: (event: EarthEvent) => void;
}) {
  const [hasOpened, setHasOpened] = useState(false);
  const resource = useEarthResource(
    hasOpened ? "historical-events" : null,
    loadEvents,
  );
  const options = useMemo(
    () =>
      buildStudyAreas(
        countries,
        regions,
        current,
        [
          ...new Map(
            [
              ...(currentEvent ? [currentEvent] : []),
              ...(resource.data?.events ?? []),
            ].map((event) => [event.id, event]),
          ).values(),
        ],
        catalog.variables,
      ),
    [
      countries,
      regions,
      current,
      resource.data,
      currentEvent,
      catalog.variables,
    ],
  );
  return (
    <div className="study-context-picker">
      <SearchPicker
        id={id}
        label="Study context"
        value={currentEvent ? `event:${currentEvent.id}` : current.id}
        placeholder="Choose a country, place or event"
        options={options}
        groups={groups}
        loading={resource.loading}
        onOpenChange={(open) => {
          if (open) setHasOpened(true);
        }}
        note={null}
        onChange={(id) => {
          const option = options.find((option) => option.id === id);
          if (!option || option.disabled) return;
          if (option.event) onEvent(option.event);
          else onChange(option.region);
        }}
      />
      {currentEvent && (
        <details className="study-event-selection">
          <summary>Event context & limits</summary>
          <p>
            {currentEvent.location} · {currentEvent.window.join(" – ")}
          </p>
          <p>{currentEvent.limitation}</p>
          <a href={currentEvent.source.url} target="_blank" rel="noreferrer">
            {currentEvent.source.name}
          </a>
        </details>
      )}
      {hasOpened && resource.error && (
        <p className="study-events-error" role="status">
          Events could not be loaded. Countries and places remain available.{" "}
          <button type="button" onClick={resource.retry}>
            Retry events
          </button>
        </p>
      )}
    </div>
  );
}
