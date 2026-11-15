import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { EarthVariable } from "../lib/earthApi";
import { realUnit } from "../lib/earthApi";
import { DomainIcon } from "../lib/domains";
import { windComponents } from "../lib/wind";
import "./multivariable-layers.css";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
const isAvailable = (variable: EarthVariable) =>
  variable.available !== false &&
  variable.months.some((month) => month.validSamples > 0);

export function MultiVariablePicker({
  id,
  variables,
  selected,
  onApply,
}: {
  id: string;
  variables: EarthVariable[];
  selected: string[];
  onApply: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>([]);
  const [rightAligned, setRightAligned] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const available = variables.filter(isAvailable);
  const availableIds = new Set(available.map((variable) => variable.id));
  const validDraft = draft.filter(
    (id, index) => availableIds.has(id) && draft.indexOf(id) === index,
  );
  const close = (focus = false) => {
    setOpen(false);
    if (focus) trigger.current?.focus();
  };
  const apply = () => {
    if (!validDraft.length) return;
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
        Variables
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
            const left = trigger.current?.getBoundingClientRect().left ?? 0;
            setRightAligned(
              left + Math.min(430, document.documentElement.clientWidth - 40) >
                document.documentElement.clientWidth - 16,
            );
          }
          setOpen(!open);
        }}
      >
        <span id={`${id}-value`}>{selected.length} selected</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
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
          <label className="multi-variable-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={search}
              type="search"
              value={query}
              aria-label="Search variables"
              placeholder="Search variable, product or unit…"
              onChange={(event) => setQuery(event.target.value)}
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
            <button
              type="button"
              onClick={() => setDraft([])}
            >
              Clear
            </button>
            <span>{validDraft.length} selected</span>
          </div>
          <div
            className="multi-variable-options"
            role="group"
            aria-label="Available variable choices"
          >
            {matches.map((variable) => {
              const available = isAvailable(variable);
              const wind = windComponents(variable.id);
              return (
                <label
                  key={variable.id}
                  className={available ? "" : "is-unavailable"}
                >
                  <input
                    type="checkbox"
                    checked={draft.includes(variable.id)}
                    disabled={!available}
                    onChange={(event) =>
                      setDraft((previous) =>
                        event.target.checked
                          ? [
                              ...previous.filter((id) => id !== variable.id),
                              variable.id,
                            ]
                          : previous.filter((id) => id !== variable.id),
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
                    {(variable.domain || !available || wind) && (
                      <small className="multi-variable-meta">
                        {variable.domain && (
                          <span
                            className="multi-variable-domain"
                            data-domain={variable.domain}
                          >
                            <DomainIcon domain={variable.domain} />
                            {variable.domain}
                          </span>
                        )}
                        {!available && <span>unavailable</span>}
                        {wind && <span>↗ paired wind arrows</span>}
                      </small>
                    )}
                  </span>
                </label>
              );
            })}
            {!matches.length && (
              <p>No matching variables. Try a name, product or unit.</p>
            )}
          </div>
          <p className="multi-variable-note">
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
              disabled={!validDraft.length}
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
