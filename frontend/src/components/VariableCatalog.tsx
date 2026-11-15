import { useId, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CloudRain,
  Compass,
  Droplets,
  ExternalLink,
  FlaskConical,
  Info,
  Layers2,
  Leaf,
  Plus,
  Search,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import type { EarthCatalog, EarthRegion } from "../lib/earthApi";
import {
  ecosystemProcesses,
  ecosystemUnlinkedSignals,
} from "../lib/ecosystems";
import {
  buildCatalogIndex,
  catalogEcosystems,
  catalogKind,
  catalogSource,
  catalogSources,
  catalogTopics,
  catalogProfiles,
  filterCatalog,
  planCatalogInvestigation,
} from "../lib/variableCatalog";
import type {
  CatalogEntry,
  CatalogInvestigation,
  CatalogTopic,
  EcosystemId,
} from "../lib/variableCatalog";
import { Modal } from "./Modal";
import { WorkspaceTour } from "./WorkspaceTour";
import "./variable-catalog.css";

const topicIcons = {
  water: Droplets,
  heat: Thermometer,
  air: Wind,
  ice: Snowflake,
};
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const monthLabel = (value: string) =>
  monthFormatter.format(new Date(`${value}-01T00:00:00Z`));
const unitLabel = (unit: string) =>
  unit === "1"
    ? "dimensionless"
    : unit
        .replace("degC", "°C")
        .replace("kg m-2 s-1", "kg m⁻² s⁻¹")
        .replace("kg m-3", "kg m⁻³")
        .replace("W m-2", "W m⁻²");
const isVariance = (entry: CatalogEntry) =>
  /(^|_)var_|variance/i.test(`${entry.variable.id} ${entry.variable.name}`);
function entryTitle(entry: CatalogEntry) {
  return entry.profile?.title ?? entry.variable.name;
}

// Conceptual vector scenes. No map boundaries or observed conditions are implied.
function EcosystemArt({ ecosystem }: { ecosystem: EcosystemId }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="vc-ecosystem-art"
      viewBox="0 0 340 170"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="currentColor" stopOpacity=".02" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".17" />
        </linearGradient>
      </defs>
      <rect width="340" height="170" fill={`url(#${id})`} />
      {ecosystem === "amazon" || ecosystem === "congo" ? (
        <>
          <path
            d="M0 112Q40 82 80 106T160 97T240 100T340 85V170H0Z"
            fill="currentColor"
            opacity=".1"
          />
          {[22, 67, 108, 159, 198, 249, 293, 329].map((x, i) => (
            <g key={x} transform={`translate(${x} ${75 + (i % 3) * 15})`}>
              <path
                d="M0 52V-3M0 14L-13 4M0 24L15 10"
                stroke="currentColor"
                opacity=".35"
                strokeWidth="2"
              />
              <path
                d="M-21 1Q-24-17-9-19Q-6-37 9-26Q26-29 24-12Q39 1 21 10Q4 22-9 12Q-26 15-21 1Z"
                fill="currentColor"
                opacity={0.14 + (i % 3) * 0.04}
              />
            </g>
          ))}
          <path
            d="M219 110Q150 127 208 138T158 170H202Q253 146 220 135T252 113"
            fill="currentColor"
            opacity=".2"
          />
        </>
      ) : ecosystem === "boreal" ? (
        <>
          <path
            d="M0 120Q90 77 176 106T340 91V170H0Z"
            fill="currentColor"
            opacity=".09"
          />
          {[23, 68, 112, 161, 210, 258, 308].map((x, index) => (
            <g key={x} transform={`translate(${x} ${35 + (index % 3) * 12})`}>
              <path
                d="M0 0L-22 37H-12L-30 62H-17L-35 87H35L17 62H30L12 37H22Z"
                fill="currentColor"
                opacity={0.14 + (index % 3) * 0.035}
              />
              <path
                d="M0 75V111"
                stroke="currentColor"
                opacity=".3"
                strokeWidth="3"
              />
            </g>
          ))}
        </>
      ) : ecosystem === "pantanal" ? (
        <>
          <path
            d="M0 108Q72 84 146 103T340 94V170H0Z"
            fill="currentColor"
            opacity=".1"
          />
          {[124, 147, 164].map((y) => (
            <path
              key={y}
              d={`M0 ${y}Q45 ${y - 8} 95 ${y}T190 ${y}T290 ${y}H340`}
              fill="none"
              stroke="currentColor"
              opacity=".2"
            />
          ))}
          {[35, 64, 255, 291, 317].map((x, i) => (
            <path
              key={x}
              d={`M${x} 152V${77 + (i % 2) * 12}M${x} 125Q${x - 22} 98 ${x - 17} 92M${x} 132Q${x + 23} 105 ${x + 16} 98`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity=".3"
            />
          ))}
          <path
            d="M130 85Q145 73 159 86M159 86Q174 72 189 85"
            fill="none"
            stroke="currentColor"
            opacity=".3"
          />
        </>
      ) : ecosystem === "sahara" ? (
        <>
          <circle cx="268" cy="45" r="24" fill="currentColor" opacity=".14" />
          <path
            d="M0 121Q78 43 161 111T340 99V170H0Z"
            fill="currentColor"
            opacity=".12"
          />
          <path
            d="M0 143Q96 88 191 142T340 111V170H0Z"
            fill="currentColor"
            opacity=".15"
          />
          <path
            d="M0 160Q125 111 220 157T340 143"
            fill="none"
            stroke="currentColor"
            opacity=".25"
          />
          <path
            d="M41 54H123Q142 54 142 43Q142 34 134 36M68 68H173M90 83H143"
            fill="none"
            stroke="currentColor"
            opacity=".19"
            strokeLinecap="round"
          />
        </>
      ) : ecosystem === "ocean" || ecosystem === "coral" ? (
        <>
          <circle cx="266" cy="38" r="20" fill="currentColor" opacity=".12" />
          {[84, 106, 128, 150].map((y, i) => (
            <path
              key={y}
              d={`M-30 ${y}Q10 ${y - 22} 50 ${y}T130 ${y}T210 ${y}T290 ${y}T370 ${y}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={i === 3 ? 15 : 2}
              opacity={0.12 + i * 0.025}
            />
          ))}
          <path
            d="M65 60V37M59 43L65 37L71 43M164 73V45M158 51L164 45L170 51"
            fill="none"
            stroke="currentColor"
            opacity=".26"
          />
          {ecosystem === "coral" && (
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".3"
            >
              <path d="M78 169V123L61 108M78 139L96 123M61 108V94M61 108L46 106M96 123V108M235 170V122L217 110M235 145L257 132M257 132L269 110M257 132L278 134M217 110V94M217 110L204 107" />
              <path d="M144 170V139Q127 135 125 121M144 153Q162 143 166 127" />
            </g>
          )}
        </>
      ) : (
        <>
          <path
            d="M0 134L69 79L104 111L174 40L247 115L285 81L340 124V170H0Z"
            fill="currentColor"
            opacity=".14"
          />
          <path
            d="M174 40L136 83L166 73L184 84L199 75Z M69 79L46 105L68 96L81 103L89 98Z"
            fill="currentColor"
            opacity=".28"
          />
          <path
            d="M20 151L103 133L145 145L206 129L272 147L330 136M56 165L145 152L224 163"
            fill="none"
            stroke="currentColor"
            opacity=".24"
          />
          <circle cx="273" cy="35" r="15" fill="currentColor" opacity=".1" />
        </>
      )}
    </svg>
  );
}

function CatalogCard({
  entry,
  selected,
  limitReached,
  onDetails,
  onToggle,
}: {
  entry: CatalogEntry;
  selected: boolean;
  limitReached: boolean;
  onDetails: () => void;
  onToggle: () => void;
}) {
  const Icon = entry.profile
    ? topicIcons[entry.profile.topic]
    : SlidersHorizontal;
  return (
    <article
      className={`vc-variable-card${selected ? " is-selected" : ""}`}
      data-topic={entry.profile?.topic ?? "technical"}
    >
      <button
        className="vc-card-main"
        onClick={onDetails}
        aria-label={`Learn about ${entryTitle(entry)}`}
      >
        <span className="vc-card-top">
          <span className="vc-variable-icon">
            <Icon size={21} strokeWidth={1.4} />
          </span>
          <span
            className={`vc-availability${entry.months.length ? " is-available" : ""}`}
          >
            <i />
            {entry.months.length ? "Data available" : "No valid months"}
          </span>
        </span>
        <span className="vc-card-title">{entryTitle(entry)}</span>
        <span className="vc-card-summary">
          {entry.profile?.summary ??
            "Technical catalog entry. Open the source definition, coverage and processing details before interpreting this field."}
        </span>
        <span className="vc-card-meta">
          <span>{catalogKind(entry.variable)}</span>
          <span>{unitLabel(entry.variable.unit)}</span>
        </span>
      </button>
      <div className="vc-card-bottom">
        <button className="vc-learn-button" onClick={onDetails}>
          Field notes <ArrowUpRight size={13} />
        </button>
        <button
          className={`vc-add-button${selected ? " is-added" : ""}`}
          onClick={onToggle}
          disabled={!selected && (!entry.months.length || limitReached)}
          aria-pressed={selected}
          aria-label={`${selected ? "Remove" : "Add"} ${entryTitle(entry)} ${selected ? "from" : "to"} investigation`}
          title={
            !entry.months.length
              ? "No valid months in the runtime catalog"
              : limitReached && !selected
                ? "Choose up to 6 variables"
                : undefined
          }
        >
          {selected ? <Check size={14} /> : <Plus size={14} />}
          {selected ? "Added" : "Add"}
        </button>
      </div>
    </article>
  );
}

function ProfileNotes({
  entry,
  entries,
  selected,
  onSelect,
  onRelated,
  limitReached,
}: {
  entry: CatalogEntry;
  entries: CatalogEntry[];
  selected: boolean;
  onSelect: () => void;
  onRelated: (id: string) => void;
  limitReached: boolean;
}) {
  const profile = entry.profile;
  const source = catalogSource(entry.variable);
  const byId = new Map(entries.map((item) => [item.variable.id, item]));
  return (
    <div className="vc-profile" data-topic={profile?.topic ?? "technical"}>
      <div className="vc-profile-badges">
        <span>{catalogKind(entry.variable)}</span>
        <span>{unitLabel(entry.variable.unit)}</span>
        {isVariance(entry) && (
          <span>Variance · not measurement uncertainty</span>
        )}
      </div>
      <p className="vc-profile-intro">
        {profile?.summary ??
          "This technical entry has no reviewed beginner explanation yet. The runtime source definition is shown below; do not interpret it as a validated ecosystem indicator."}
      </p>
      {profile ? (
        <>
          <div className="vc-note-grid">
            <section>
              <span className="vc-section-kicker">
                <Leaf size={14} /> ITS ROLE IN THE SYSTEM
              </span>
              <p>{profile.role}</p>
            </section>
            <section>
              <span className="vc-section-kicker">
                <ArrowUpRight size={14} /> WHEN IT CHANGES
              </span>
              <p>{profile.interpretation}</p>
            </section>
          </div>
          <section className="vc-profile-caution">
            <Info size={17} />
            <div>
              <h3>Read the signal with context</h3>
              <p>{profile.caution}</p>
            </div>
          </section>
          <section className="vc-related">
            <span className="vc-section-kicker">
              <Layers2 size={14} /> CONNECT THE VARIABLES
            </span>
            <p className="vc-small-note">
              Published process context, not a correlation or causal result
              calculated here.
            </p>
            {profile.related.map((relation) => {
              const other = byId.get(relation.id);
              return other ? (
                <button
                  key={relation.id}
                  onClick={() => onRelated(relation.id)}
                >
                  <span>
                    <strong>{entryTitle(other)}</strong>
                    <small>{relation.relationship}</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ) : (
                <div className="vc-unavailable-relation" key={relation.id}>
                  <strong>{relation.id}</strong>
                  <p>{relation.relationship}</p>
                  <small>Not in the current runtime catalog</small>
                </div>
              );
            })}
          </section>
          {entry.variable.id === "merra2_aer_duexttau" && (
            <a
              className="vc-source-link"
              href={catalogSources.dust.url}
              target="_blank"
              rel="noreferrer"
            >
              Read NASA’s Sahara–Amazon connection <ExternalLink size={13} />
            </a>
          )}
          <section className="vc-profile-question">
            <FlaskConical size={19} />
            <div>
              <span className="vc-section-kicker">
                A QUESTION TO START WITH
              </span>
              <p>{profile.question}</p>
            </div>
          </section>
        </>
      ) : (
        <section className="vc-profile-caution">
          <Info size={17} />
          <p>
            {catalogKind(entry.variable) === "Simulator diagnostic"
              ? "This is an instrument-simulator diagnostic from a model, not a MODIS observation. Similar names do not establish equivalent measurements."
              : isVariance(entry)
                ? "Native temporal variance is not pooled regional variance, a trend confidence interval or propagated uncertainty."
                : "Preserve the source units, level and aggregation. A catalog entry alone does not establish regional coverage or scientific interpretation."}
          </p>
        </section>
      )}
      <details className="vc-provenance" open={!profile}>
        <summary>Source, coverage & processing</summary>
        <dl>
          <div>
            <dt>Product</dt>
            <dd>{entry.variable.product}</dd>
          </div>
          <div>
            <dt>Field</dt>
            <dd>{entry.variable.id}</dd>
          </div>
          <div>
            <dt>Displayed unit</dt>
            <dd>{unitLabel(entry.variable.unit)}</dd>
          </div>
          <div>
            <dt>Valid catalog months</dt>
            <dd>
              {entry.months.length
                ? `${monthLabel(entry.months[0])} – ${monthLabel(entry.months.at(-1)!)} · ${entry.months.length} months`
                : "No valid months available"}
            </dd>
          </div>
          {entry.variable.description && (
            <div>
              <dt>Producer / catalog definition</dt>
              <dd>
                {entry.variable.description}{" "}
                <small>
                  Original source encodings can differ from the displayed unit
                  above.
                </small>
              </dd>
            </div>
          )}
          {entry.variable.aggregation && (
            <div>
              <dt>Aggregation</dt>
              <dd>
                {
                  {
                    area_weighted_mean: "Area-weighted mean",
                    sum: "Sum",
                    weighted_mode: "Area-weighted modal class",
                  }[entry.variable.aggregation]
                }
              </dd>
            </div>
          )}
          {entry.variable.quality && (
            <div>
              <dt>Quality</dt>
              <dd>
                {entry.variable.quality.notes.map((note) => (
                  <p className="vc-quality-note" key={note}>
                    {note}
                  </p>
                ))}
                <small>
                  Source rule: <code>{entry.variable.quality.rule}</code>
                </small>
              </dd>
            </div>
          )}
        </dl>
        <p>
          Catalog dates describe overall availability. Regional coverage, gaps
          and quality must be checked when the series is loaded.
        </p>
      </details>
      {source && (
        <a
          className="vc-source-link"
          href={source.url}
          target="_blank"
          rel="noreferrer"
        >
          {source.name} <ExternalLink size={13} />
        </a>
      )}
      <div className="vc-profile-actions">
        <span>
          {entry.months.length
            ? "Build a question with this variable."
            : "Explanation available; data unavailable."}
        </span>
        <button
          className="vc-primary-button"
          disabled={!selected && (!entry.months.length || limitReached)}
          onClick={onSelect}
        >
          {selected ? <Check size={15} /> : <Plus size={15} />}
          {selected ? "Remove from investigation" : "Add to investigation"}
        </button>
      </div>
    </div>
  );
}

export default function VariableCatalog({
  catalog,
  onOpen,
  onOpenArea,
  active,
}: {
  catalog: EarthCatalog;
  active: boolean;
  onOpen: (investigation: CatalogInvestigation) => void;
  onOpenArea: (region: EarthRegion) => void;
}) {
  const entries = useMemo(
    () => buildCatalogIndex(catalog.variables),
    [catalog.variables],
  );
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<CatalogTopic | "all">("all");
  const [ecosystem, setEcosystem] = useState<EcosystemId | "all">("all");
  const [full, setFull] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string>("current");
  const [visibleCount, setVisibleCount] = useState(24);
  const [announcement, setAnnouncement] = useState("");
  const [builderExpanded, setBuilderExpanded] = useState(false);
  const matches = useMemo(
    () =>
      filterCatalog(entries, { query, topic, ecosystem, full, availableOnly }),
    [entries, query, topic, ecosystem, full, availableOnly],
  );
  const byId = useMemo(
    () => new Map(entries.map((entry) => [entry.variable.id, entry])),
    [entries],
  );
  const plan = useMemo(
    () => planCatalogInvestigation(catalog.variables, selected),
    [catalog.variables, selected],
  );
  const activeEcosystem = catalogEcosystems.find(
    (item) => item.id === ecosystem,
  );
  const ecosystemVariables = activeEcosystem
    ? catalogProfiles.filter((profile) =>
        profile.ecosystems.includes(activeEcosystem.id),
      )
    : [];
  const region = catalogEcosystems.find((item) => item.id === regionId)?.region;
  const detailEntry = detail ? byId.get(detail) : undefined;
  const selectedSet = new Set(selected);
  const fieldGuideCount = entries.filter((entry) => entry.profile).length;
  const clearFilters = () => {
    setQuery("");
    setTopic("all");
    setEcosystem("all");
    setAvailableOnly(false);
    setVisibleCount(24);
  };
  const toggle = (id: string) => {
    const entry = byId.get(id);
    if (selectedSet.has(id)) {
      setSelected((previous) => previous.filter((item) => item !== id));
      setAnnouncement(`${entry ? entryTitle(entry) : id} removed.`);
    } else if (entry && entry.months.length && selected.length < 6) {
      setSelected((previous) => [...previous, id]);
      setAnnouncement(`${entryTitle(entry)} added to your investigation.`);
    }
  };
  const chooseEcosystem = (id: EcosystemId) => {
    const next = ecosystem === id ? "all" : id;
    setEcosystem(next);
    setRegionId(next === "all" ? "current" : next);
    setTopic("all");
    setQuery("");
    setVisibleCount(24);
    if (next !== "all")
      requestAnimationFrame(() =>
        document.getElementById("vc-ecosystem-detail")?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        }),
      );
  };
  return (
    <div className="variable-catalog">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <header className="vc-heading">
        <div>
          <span className="vc-eyebrow">
            <BookOpen size={14} /> THE EARTH SYSTEM FIELD GUIDE
          </span>
          <h2>
            Every variable tells <em>part of the story.</em>
          </h2>
          <p>
            Understand what we measure, why it matters, and how it connects.
            <br className="vc-desktop-break" /> Then turn your curiosity into an
            investigation.
          </p>
        </div>
        <div className="vc-heading-actions">
          <WorkspaceTour
            workspace="catalog"
            active={active}
            onStart={() => {
              setDetail(null);
              setBuilderExpanded(true);
            }}
          />
          <div className="vc-heading-note">
            <span>
              <span className="vc-step-number">01</span> Discover a variable
            </span>
            <span>
              <span className="vc-step-number">02</span> Connect the pieces
            </span>
            <span>
              <span className="vc-step-number">03</span> Follow the evidence{" "}
              <ArrowDown size={12} />
            </span>
          </div>
        </div>
      </header>
      <section
        className="vc-ecosystems"
        id="vc-ecosystem-gallery"
        aria-label="Discover variables by ecosystem"
      >
        <div className="vc-section-title">
          <h3>
            <Compass size={16} /> Start with a place
          </h3>
          <span>{catalogEcosystems.length} systems. One connected planet.</span>
        </div>
        <div className="vc-ecosystem-grid">
          {catalogEcosystems.map((item) => (
            <button
              key={item.id}
              className={`vc-ecosystem${ecosystem === item.id ? " is-active" : ""}`}
              data-ecosystem={item.id}
              aria-pressed={ecosystem === item.id}
              onClick={() => chooseEcosystem(item.id)}
            >
              <EcosystemArt ecosystem={item.id} />
              <span className="vc-ecosystem-location">{item.coordinates}</span>
              <span className="vc-ecosystem-title">
                {item.name}
                <span className="vc-ecosystem-arrow">
                  {ecosystem === item.id ? (
                    <Check size={15} />
                  ) : (
                    <ArrowUpRight size={16} />
                  )}
                </span>
              </span>
              <span className="vc-ecosystem-subtitle">{item.subtitle}</span>
            </button>
          ))}
        </div>
        <span className="vc-art-note">
          Conceptual illustrations · not satellite imagery
        </span>
      </section>
      {activeEcosystem && (
        <section
          className="vc-ecosystem-context"
          id="vc-ecosystem-detail"
          data-ecosystem={activeEcosystem.id}
        >
          <Leaf size={21} />
          <div className="vc-ecosystem-detail-content">
            <div className="vc-area-detail-heading">
              <h3>{activeEcosystem.name}</h3>
              <button
                className="vc-primary-button"
                onClick={() => onOpenArea(activeEcosystem.region)}
              >
                View area in Explore <ArrowUpRight size={15} />
              </button>
            </div>
            <span className="vc-section-kicker">
              PROCESSES THAT SUSTAIN THIS SYSTEM
            </span>
            <h3>{activeEcosystem.question}</h3>
            <p>{activeEcosystem.summary}</p>
            <div className="vc-process-tags" aria-label="Ecosystem processes">
              {ecosystemProcesses[activeEcosystem.id].map((process) => (
                <span key={process}>{process}</span>
              ))}
            </div>
            <section
              className="vc-ecosystem-signals"
              aria-label={`Relevant variables for ${activeEcosystem.name}`}
            >
              <h4>
                Variables that help explain this system{" "}
                <span>{ecosystemVariables.length}</span>
              </h4>
              <p>
                Reviewed context variables, not an exhaustive ecosystem health
                checklist. Catalog availability does not guarantee coverage in
                this region.
              </p>
              <div className="vc-signal-tags">
                {ecosystemVariables.map((profile) => {
                  const entry = byId.get(profile.id);
                  const Icon = topicIcons[profile.topic];
                  return (
                    <button
                      key={profile.id}
                      data-topic={profile.topic}
                      disabled={!entry}
                      onClick={() => setDetail(profile.id)}
                      aria-label={`Learn about ${profile.title} for ${activeEcosystem.name}`}
                      title={profile.summary}
                    >
                      <Icon size={14} />
                      <span>{profile.title}</span>
                      <small>
                        {entry?.months.length ? "Catalog data" : "Unavailable"}
                      </small>
                      <Info size={12} />
                    </button>
                  );
                })}
              </div>
              <h4>Other important measurements</h4>
              <p>
                These signals are not linked to a dataset in this guide. Expand
                a tag to see what it would add.
              </p>
              <div className="vc-unlinked-signals">
                {ecosystemUnlinkedSignals[activeEcosystem.id].map((signal) => (
                  <details key={signal.name}>
                    <summary>
                      {signal.name}
                      <small>Not linked</small>
                    </summary>
                    <p>{signal.reason}</p>
                  </details>
                ))}
              </div>
            </section>
            <details>
              <summary>Study area, source & limits</summary>
              <p>{activeEcosystem.limitation}</p>
              <a
                href={activeEcosystem.source.url}
                target="_blank"
                rel="noreferrer"
              >
                {activeEcosystem.source.name} <ExternalLink size={12} />
              </a>
            </details>
          </div>
          <button
            className="vc-context-close"
            aria-label="Clear ecosystem filter"
            onClick={() => {
              setEcosystem("all");
              requestAnimationFrame(() =>
                document
                  .getElementById("vc-ecosystem-gallery")
                  ?.scrollIntoView({ block: "start" }),
              );
            }}
          >
            <X size={17} />
          </button>
        </section>
      )}
      <section className="vc-browser" aria-labelledby="vc-browse-heading">
        <div className="vc-browser-heading">
          <div>
            <h3 id="vc-browse-heading">
              Find your variables
              <span>{full ? entries.length : fieldGuideCount}</span>
            </h3>
            <p>
              {full
                ? "The complete runtime inventory, including technical diagnostics and unavailable fields."
                : "A curated starting point. Plain-language notes, connected to real data."}
            </p>
          </div>
          <div
            className="vc-view-toggle"
            role="group"
            aria-label="Catalog scope"
          >
            <button
              aria-pressed={!full}
              onClick={() => {
                setFull(false);
                setVisibleCount(24);
              }}
            >
              <Sparkles size={13} /> Field guide
            </button>
            <button
              aria-pressed={full}
              onClick={() => {
                setFull(true);
                setVisibleCount(24);
              }}
            >
              Full catalog
            </button>
          </div>
        </div>
        {full && (
          <p className="vc-inventory-note">
            Topic and ecosystem links are reviewed for the field guide.
            Technical entries keep their source definitions and remain
            searchable under All topics.
          </p>
        )}
        <div className="vc-toolbar">
          <label className="vc-search">
            <Search size={17} />
            <input
              type="search"
              value={query}
              placeholder="Try rainfall, heat, dust…"
              aria-label="Search variables"
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(24);
              }}
            />
            {query && (
              <button
                aria-label="Clear variable search"
                onClick={() => {
                  setQuery("");
                  setVisibleCount(24);
                }}
              >
                <X size={15} />
              </button>
            )}
          </label>
          <label className="vc-available-check">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => {
                setAvailableOnly(event.target.checked);
                setVisibleCount(24);
              }}
            />{" "}
            Data available only
          </label>
        </div>
        <div
          className="vc-topics"
          role="group"
          aria-label="Filter by Earth system topic"
        >
          <button
            aria-pressed={topic === "all"}
            onClick={() => {
              setTopic("all");
              setVisibleCount(24);
            }}
          >
            All topics
          </button>
          {catalogTopics.map((item) => {
            const Icon = topicIcons[item.id];
            return (
              <button
                key={item.id}
                aria-pressed={topic === item.id}
                onClick={() => {
                  setTopic(item.id);
                  setVisibleCount(24);
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="vc-results-bar">
          <span role="status">
            {matches.length} {matches.length === 1 ? "variable" : "variables"}
            {activeEcosystem ? ` · ${activeEcosystem.name}` : ""}
            {query ? ` matching “${query}”` : ""}
          </span>
          {(query ||
            topic !== "all" ||
            ecosystem !== "all" ||
            availableOnly) && (
            <button onClick={clearFilters}>
              Reset filters <X size={12} />
            </button>
          )}
          <span className="vc-results-hint">
            Select up to 6 to investigate together
          </span>
        </div>
        <div className="vc-browser-layout">
          <div>
            <div className="vc-variable-grid">
              {matches.slice(0, visibleCount).map((entry) => (
                <CatalogCard
                  key={entry.variable.id}
                  entry={entry}
                  selected={selectedSet.has(entry.variable.id)}
                  limitReached={selected.length >= 6}
                  onDetails={() => setDetail(entry.variable.id)}
                  onToggle={() => toggle(entry.variable.id)}
                />
              ))}
            </div>
            {!matches.length && (
              <div className="vc-empty">
                <Search size={27} />
                <h4>No variables found</h4>
                <p>
                  {!full
                    ? "Try a broader search or switch to the full technical catalog."
                    : "Try fewer search terms or clear the ecosystem and topic filters."}
                </p>
                <div>
                  <button onClick={clearFilters}>Clear filters</button>
                  {!full && (
                    <button
                      onClick={() => {
                        setFull(true);
                        setVisibleCount(24);
                      }}
                    >
                      Search full catalog <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}
            {matches.length > visibleCount && (
              <button
                className="vc-load-more"
                onClick={() => setVisibleCount((previous) => previous + 24)}
              >
                Show 24 more{" "}
                <span>
                  {Math.min(visibleCount, matches.length)} of {matches.length}
                </span>
                <ArrowDown size={14} />
              </button>
            )}
          </div>
          <aside
            className="vc-investigation"
            aria-labelledby="vc-investigation-heading"
          >
            <button
              className="vc-mobile-builder-toggle"
              aria-expanded={builderExpanded}
              aria-controls="vc-builder-content"
              onClick={() => setBuilderExpanded((previous) => !previous)}
            >
              <Layers2 size={16} />
              <span>
                {selected.length
                  ? `${selected.length} / 6 variables selected`
                  : "Build your investigation"}
              </span>
              <ChevronDown size={16} />
            </button>
            <div
              id="vc-builder-content"
              className={`vc-builder-content${builderExpanded ? " is-expanded" : ""}`}
            >
              <span className="vc-section-kicker">
                <FlaskConical size={15} /> YOUR NEXT QUESTION
              </span>
              <h3 id="vc-investigation-heading">Connect your variables.</h3>
              <p className="vc-investigation-description">
                Build a shared view of the system. Start with one signal, then
                add context.
              </p>
              {selected.length ? (
                <>
                  <div className="vc-selected-list">
                    {selected.map((id) => {
                      const entry = byId.get(id);
                      return (
                        <div key={id}>
                          <span
                            className="vc-selected-dot"
                            data-topic={entry?.profile?.topic ?? "technical"}
                          />
                          <button
                            className="vc-selected-name"
                            disabled={!entry}
                            onClick={() => setDetail(id)}
                          >
                            {entry ? entryTitle(entry) : id}
                          </button>
                          <button
                            className="vc-remove"
                            aria-label={`Remove ${entry ? entryTitle(entry) : id}`}
                            onClick={() => toggle(id)}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="vc-selection-count">
                    <span>{selected.length} / 6 selected</span>
                    <button
                      onClick={() => {
                        setSelected([]);
                        setAnnouncement("Investigation selection cleared.");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </>
              ) : (
                <div className="vc-selection-empty">
                  <span>
                    <CloudRain size={19} />
                    <Plus size={12} />
                    <Thermometer size={19} />
                  </span>
                  <p>
                    A little rain.
                    <br />A little heat.
                    <br />
                    <em>A bigger question.</em>
                  </p>
                  <small>
                    Use <strong>+ Add</strong> on any variable.
                  </small>
                </div>
              )}
              <label className="vc-region-label" htmlFor="vc-study-region">
                Study area
              </label>
              <select
                id="vc-study-region"
                value={regionId}
                onChange={(event) => setRegionId(event.target.value)}
              >
                <option value="current">Current Explore area</option>
                {catalogEcosystems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · rectangle
                  </option>
                ))}
              </select>
              {selected.length > 0 && (
                <p
                  className={`vc-period${!plan ? " is-error" : ""}`}
                  role="status"
                >
                  {plan ? (
                    <>
                      {monthLabel(plan.start)} – {monthLabel(plan.end)}
                      <span>
                        {plan.commonMonths} common catalog months · regional
                        coverage checked on load
                      </span>
                    </>
                  ) : (
                    <>
                      No shared valid months.
                      <span>
                        Remove unavailable variables or choose a different
                        combination.
                      </span>
                    </>
                  )}
                </p>
              )}
              <button
                className="vc-primary-button vc-open-investigation"
                disabled={!plan}
                onClick={() => {
                  if (plan) onOpen({ ...plan, region });
                }}
              >
                Open in Explore <ArrowRight size={15} />
              </button>
              <p className="vc-builder-footnote">
                A saved combination is an investigation, not a new validated
                scientific indicator. You can save it from Explore.
              </p>
            </div>
          </aside>
        </div>
      </section>
      {selected.length > 0 && !detailEntry && (
        <div className="vc-mobile-selection-bar">
          <button
            onClick={() => {
              setBuilderExpanded(true);
              requestAnimationFrame(() =>
                document
                  .getElementById("vc-investigation-heading")
                  ?.scrollIntoView({
                    block: "center",
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "instant"
                      : "smooth",
                  }),
              );
            }}
          >
            <Layers2 size={16} />
            <span>
              {selected.length} selected<small>Review variables & area</small>
            </span>
          </button>
          <button
            disabled={!plan}
            onClick={() => {
              if (plan) onOpen({ ...plan, region });
            }}
          >
            Explore <ArrowRight size={15} />
          </button>
        </div>
      )}
      {detailEntry && (
        <Modal
          key={detailEntry.variable.id}
          title={entryTitle(detailEntry)}
          onClose={() => setDetail(null)}
          wide
        >
          <ProfileNotes
            key={detailEntry.variable.id}
            entry={detailEntry}
            entries={entries}
            selected={selectedSet.has(detailEntry.variable.id)}
            onSelect={() => toggle(detailEntry.variable.id)}
            onRelated={(id) => setDetail(id)}
            limitReached={selected.length >= 6}
          />
        </Modal>
      )}
    </div>
  );
}
