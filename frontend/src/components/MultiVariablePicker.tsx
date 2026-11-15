import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { EarthVariable } from "../lib/earthApi";
import { realUnit } from "../lib/earthApi";
import { DomainIcon } from "../lib/domains";
import { windComponents } from "../lib/wind";
import {
  groupVariables,
  toggleVariableGroup,
  variableAvailable as isAvailable,
} from "../lib/variableGroups";
import "./multivariable-layers.css";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

export function MultiVariablePicker({
  id,
  variables,
  selected,
  onApply,
  summary,
  label = "Variables",
  single = false,
  optional = false,
}: {
  id: string;
  variables: EarthVariable[];
  selected: string[];
  onApply: (ids: string[]) => void;
  summary?: string;
  label?: string;
  single?: boolean;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rightAligned, setRightAligned] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const available = variables.filter(isAvailable);
  const availableIds = new Set(available.map((variable) => variable.id));
  const selectedVariables = selected.flatMap((id) => {
    const variable = variables.find((entry) => entry.id === id);
    return variable ? [variable] : [];
  });
  const selectionLabel =
    selectedVariables.map((variable) => variable.name).join(", ") ||
    "Choose variables";
  const selectionDetails = selectedVariables
    .map(
      (variable) =>
        `${variable.name} · ${realUnit(variable.unit)} · ${variable.product}${variable.run ? ` · ${variable.run}` : ""}`,
    )
    .join("\n");
  const validDraft = draft.filter(
    (id, index) => availableIds.has(id) && draft.indexOf(id) === index,
  );
  const close = (focus = false) => {
    setOpen(false);
    if (focus) trigger.current?.focus();
  };
  const apply = () => {
    if (!validDraft.length && !optional) return;
    onApply(validDraft);
    close(true);
  };
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const term = normalize(query.trim());
  const matches = variables.filter(
    (variable) =>
      !term ||
      normalize(
        `${variable.name} ${variable.id} ${variable.product} ${variable.category ?? ""} ${variable.domain ?? ""} ${variable.unit} ${realUnit(variable.unit)}`,
      ).includes(term),
  );
  const matchingIds = new Set(matches.map((variable) => variable.id));
  const groups = groupVariables(variables);
  return (
    <div
      className="multi-variable-picker"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
        } else if (
          open &&
          event.key === "Enter" &&
          (event.ctrlKey || event.metaKey)
        ) {
          event.preventDefault();
          apply();
        }
      }}
    >
      <span className="exploration-control-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        id={id}
        type="button"
        ref={trigger}
        className="multi-variable-trigger"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-dialog` : undefined}
        aria-describedby={summary ? `${id}-summary` : undefined}
        title={[selectionDetails, summary].filter(Boolean).join("\n")}
        disabled={!available.length}
        onClick={() => {
          if (!open) {
            setDraft(
              selected.filter(
                (id, index) =>
                  availableIds.has(id) && selected.indexOf(id) === index,
              ),
            );
            setQuery("");
            setExpanded({});
            const left = trigger.current?.getBoundingClientRect().left ?? 0;
            setRightAligned(
              left + Math.min(430, document.documentElement.clientWidth - 40) >
                document.documentElement.clientWidth - 16,
            );
          }
          setOpen(!open);
        }}
      >
        <span id={`${id}-value`} className="multi-variable-selection">
          <span className="multi-variable-selection-names">
            {selectionLabel}
          </span>
          <span className="multi-variable-selection-count">
            {selected.length} selected
          </span>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {summary && (
        <span id={`${id}-summary`} className="sr-only">
          {summary}
        </span>
      )}
      {open && (
        <div
          className={`multi-variable-popover${rightAligned ? " align-right" : ""}`}
          role="dialog"
          id={`${id}-dialog`}
          aria-label="Choose investigation variables"
        >
          <div className="multi-variable-heading">
            <strong>Investigation variables</strong>
            <button
              type="button"
              aria-label="Cancel variable selection"
              onClick={() => close(true)}
            >
              <X size={17} />
            </button>
          </div>
          {summary && (
            <p className="multi-variable-selection-summary">{summary}</p>
          )}
          <label className="multi-variable-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={search}
              type="search"
              value={query}
              aria-label="Search variables"
              placeholder="Search variable, product or unit…"
              onChange={(event) => {
                setQuery(event.target.value);
                setExpanded({});
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  root.current
                    ?.querySelector<HTMLInputElement>(
                      ".multi-variable-options input:not(:disabled)",
                    )
                    ?.focus();
                }
              }}
            />
          </label>
          <div className="multi-variable-bulk">
            {!single && (
              <button
                type="button"
                onClick={() =>
                  setDraft([
                    ...validDraft,
                    ...available
                      .map((variable) => variable.id)
                      .filter((id) => !validDraft.includes(id)),
                  ])
                }
              >
                Select all available
              </button>
            )}
            <button type="button" onClick={() => setDraft([])}>
              Clear
            </button>
            <span>{validDraft.length} selected</span>
          </div>
          <div
            className="multi-variable-options"
            role="group"
            aria-label="Available variable choices"
          >
            {groups.map((group) => {
              const groupMatches = group.variables.filter((variable) =>
                matchingIds.has(variable.id),
              );
              if (!groupMatches.length) return null;
              const eligible = group.variables.filter(isAvailable);
              const count = eligible.filter((variable) =>
                validDraft.includes(variable.id),
              ).length;
              const all = eligible.length > 0 && count === eligible.length;
              const partial = count > 0 && !all;
              const isExpanded = expanded[group.key] ?? Boolean(term);
              const panelId = `${id}-group-${encodeURIComponent(group.key)}`;
              return (
                <section className="multi-variable-group" key={group.key}>
                  <div className="multi-variable-group-heading">
                    {!single && (
                      <input
                        type="checkbox"
                        checked={all}
                        disabled={!eligible.length}
                        aria-label={`Select all available variables in ${group.label}`}
                        aria-checked={partial ? "mixed" : all}
                        ref={(element) => {
                          if (element) element.indeterminate = partial;
                        }}
                        onChange={() =>
                          setDraft((previous) =>
                            toggleVariableGroup(previous, group.variables),
                          )
                        }
                      />
                    )}
                    <button
                      type="button"
                      className="multi-variable-group-toggle"
                      id={`${panelId}-title`}
                      aria-expanded={isExpanded}
                      aria-controls={isExpanded ? panelId : undefined}
                      onClick={() =>
                        setExpanded((previous) => ({
                          ...previous,
                          [group.key]: !isExpanded,
                        }))
                      }
                    >
                      <span className="multi-variable-group-name">
                        <DomainIcon domain={group.key} size={16} />
                        <strong>{group.label}</strong>
                        <small>
                          {count}/{eligible.length} selected
                          {term
                            ? ` · ${groupMatches.length}/${group.variables.length} shown`
                            : ""}
                        </small>
                      </span>
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div
                      className="multi-variable-group-options"
                      role="group"
                      id={panelId}
                      aria-labelledby={`${panelId}-title`}
                    >
                      {groupMatches.map((variable) => {
                        const available = isAvailable(variable);
                        const wind = windComponents(variable.id);
                        return (
                          <label
                            key={variable.id}
                            className={available ? "" : "is-unavailable"}
                          >
                            <input
                              type={single ? "radio" : "checkbox"}
                              name={single ? `${id}-choice` : undefined}
                              checked={draft.includes(variable.id)}
                              disabled={!available}
                              onChange={(event) =>
                                setDraft((previous) =>
                                  event.target.checked
                                    ? single
                                      ? [variable.id]
                                      : [
                                          ...previous.filter(
                                            (id) => id !== variable.id,
                                          ),
                                          variable.id,
                                        ]
                                    : previous.filter(
                                        (id) => id !== variable.id,
                                      ),
                                )
                              }
                            />
                            <span>
                              <strong>
                                {variable.name}{" "}
                                <span className="multi-variable-unit">
                                  ({realUnit(variable.unit)})
                                </span>
                              </strong>
                              {(!available || wind) && (
                                <small className="multi-variable-meta">
                                  {!available && <span>unavailable</span>}
                                  {wind && <span>↗ paired wind arrows</span>}
                                </small>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
            {!matches.length && (
              <p>No matching variables. Try a name, product or unit.</p>
            )}
          </div>
          <p className="multi-variable-note">
            {term && !single && (
              <>
                Selecting a group includes all its available variables, even
                those outside this search.{" "}
              </>
            )}
            Selections take effect together when you apply. Each variable keeps
            its own units and scale.
          </p>
          <div className="multi-variable-footer">
            <button type="button" onClick={() => close(true)}>
              Cancel
            </button>
            <button
              type="button"
              className="multi-variable-apply"
              disabled={!validDraft.length && !optional}
              onClick={apply}
            >
              <Check size={15} aria-hidden="true" /> Apply{" "}
              {validDraft.length ? `(${validDraft.length})` : "selection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
