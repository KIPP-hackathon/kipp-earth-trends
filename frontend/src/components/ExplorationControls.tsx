import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Search, X, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DomainIcon } from "../lib/domains";
import { MonthPicker } from "./MonthPicker";
import { usePopoverPosition } from "../lib/usePopoverPosition";

export type SearchOption = {
  id: string;
  name: string;
  detail?: string;
  disabled?: boolean;
  suggested?: boolean;
  icon?: string;
  domain?: string;
  searchTerms?: string;
  group?: string;
};
const normalizedSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

export function SearchPicker({
  id,
  label,
  value,
  options,
  onChange,
  curated = false,
  placeholder,
  note,
  groups,
  onOpenChange,
  loading = false,
}: {
  id: string;
  label: string;
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  curated?: boolean;
  placeholder?: string;
  note?: string | null;
  groups?: { id: string; label: string; icon?: LucideIcon }[];
  onOpenChange?: (open: boolean) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    // iOS keeps the layout viewport tall while the keyboard shrinks/pans the
    // visual viewport. Let the list scroll within the space actually visible.
    const viewport = window.visualViewport;
    let horizontalShift = 0;
    const fit = () => {
      const popup = dialog.current;
      if (!popup) return;
      const left = (viewport?.offsetLeft ?? 0) + 8;
      const right =
        (viewport?.offsetLeft ?? 0) +
        (viewport?.width ?? window.innerWidth) -
        8;
      popup.style.maxWidth = `${Math.max(0, right - left)}px`;
      const bounds = popup.getBoundingClientRect();
      const naturalLeft = bounds.left - horizontalShift;
      horizontalShift = Math.max(
        left - naturalLeft,
        Math.min(0, right - naturalLeft - bounds.width),
      );
      popup.style.setProperty(
        "--search-popover-shift-x",
        `${horizontalShift}px`,
      );
      const bottom =
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
      popup.style.setProperty(
        "--search-popover-max-height",
        `${Math.max(0, bottom - popup.getBoundingClientRect().top - 8)}px`,
      );
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, true);
    viewport?.addEventListener("resize", fit);
    viewport?.addEventListener("scroll", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit, true);
      viewport?.removeEventListener("resize", fit);
      viewport?.removeEventListener("scroll", fit);
    };
  }, [open]);
  const close = (focus = false) => {
    setOpen(false);
    onOpenChange?.(false);
    if (focus) trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    dialog.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const selected = options.find((option) => option.id === value);
  const term = normalizedSearch(query.trim());
  const matches = options.filter((option) =>
    term
      ? normalizedSearch(
          `${option.name} ${option.detail ?? ""} ${option.id} ${option.domain ?? ""} ${option.searchTerms ?? ""}`,
        ).includes(term)
      : !curated || all || option.suggested || option.id === value,
  );
  return (
    <div
      className="exploration-picker"
      ref={root}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && !event.currentTarget.contains(next)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
        }
      }}
    >
      <span className="exploration-control-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        className="exploration-picker-trigger"
        type="button"
        id={id}
        ref={trigger}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-dialog` : undefined}
        title={
          selected
            ? `${selected.name}${selected.detail ? ` · ${selected.detail}` : ""}`
            : undefined
        }
        onClick={() => {
          setQuery("");
          setExpandedGroups({});
          onOpenChange?.(!open);
          setOpen(!open);
        }}
      >
        <span id={`${id}-value`} className="exploration-option-name">
          {selected?.icon && (
            <img
              className="country-flag"
              src={selected.icon}
              alt=""
              width={24}
              height={18}
            />
          )}
          {selected?.domain && (
            <DomainIcon domain={selected.domain} size={13} />
          )}
          <span>{selected?.name ?? placeholder ?? value}</span>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="exploration-popover exploration-search-popover"
          ref={dialog}
          role="dialog"
          tabIndex={-1}
          aria-label={`Choose ${label.toLowerCase()}`}
          id={`${id}-dialog`}
        >
          {groups && (
            <div className="multi-variable-heading">
              <strong>{label}</strong>
              <button
                type="button"
                aria-label="Close study context selection"
                onClick={() => close(true)}
              >
                <X size={17} />
              </button>
            </div>
          )}
          <label className="exploration-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={search}
              type="search"
              value={query}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label.toLowerCase()}`}
              onChange={(event) => {
                setQuery(event.target.value);
                setExpandedGroups({});
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  root.current
                    ?.querySelector<HTMLButtonElement>(
                      ".exploration-options button:not(:disabled)",
                    )
                    ?.focus();
                }
              }}
            />
          </label>
          {note !== null && (
            <p className="exploration-picker-note">
              {note ??
                (curated && !all && !term
                  ? "Start with a familiar variable, or search the full catalog."
                  : `${matches.length} matching ${label.toLowerCase()} options`)}
            </p>
          )}
          <div
            className="exploration-options"
            role="group"
            aria-label={`${label} options`}
          >
            {groups
              ? groups.map((group) => {
                  const groupMatches = matches.filter(
                    (option) => option.group === group.id,
                  );
                  if (term && !groupMatches.length) return null;
                  const isExpanded = expandedGroups[group.id] ?? Boolean(term);
                  const panelId = `${id}-group-${group.id}`;
                  const Icon = group.icon;
                  return (
                    <section className="multi-variable-group" key={group.id}>
                      <div className="multi-variable-group-heading">
                        <button
                          type="button"
                          className="multi-variable-group-toggle"
                          id={`${panelId}-title`}
                          aria-expanded={isExpanded}
                          aria-controls={isExpanded ? panelId : undefined}
                          onClick={() =>
                            setExpandedGroups((previous) => ({
                              ...previous,
                              [group.id]: !isExpanded,
                            }))
                          }
                        >
                          <span className="multi-variable-group-name">
                            {Icon && <Icon size={16} />}
                            <strong>{group.label}</strong>
                            <small>
                              {groupMatches.length}{" "}
                              {groupMatches.length === 1 ? "option" : "options"}
                              {groupMatches.some(
                                (option) => option.id === value,
                              )
                                ? " · 1 selected"
                                : ""}
                              {loading && group.id === "event"
                                ? " · loading"
                                : ""}
                            </small>
                          </span>
                          <ChevronDown size={16} aria-hidden="true" />
                        </button>
                      </div>
                      {isExpanded && (
                        <div
                          className="multi-variable-group-options study-context-group-options"
                          role="group"
                          id={panelId}
                          aria-labelledby={`${panelId}-title`}
                        >
                          {groupMatches.map((option) => (
                            <button
                              type="button"
                              key={option.id}
                              disabled={option.disabled}
                              title={option.group === "country" ? option.name : option.detail}
                              aria-pressed={option.id === value}
                              onClick={() => {
                                onChange(option.id);
                                close(true);
                              }}
                            >
                              <span
                                className={`study-context-choice-mark${option.id === value ? " is-selected" : ""}`}
                                aria-hidden="true"
                              >
                                {option.id === value && <Check size={12} />}
                              </span>
                              <span className="study-context-choice-text">
                                <span className="exploration-option-name">
                                  {option.icon && (
                                    <img
                                      className="country-flag"
                                      src={option.icon}
                                      alt=""
                                      width={24}
                                      height={18}
                                      loading="lazy"
                                    />
                                  )}
                                  <strong>{option.name}</strong>
                                </span>
                                {option.detail && option.group !== "country" && (
                                  <small>{option.detail}</small>
                                )}
                              </span>
                            </button>
                          ))}
                          {!groupMatches.length && (
                            <p>
                              {loading && group.id === "event"
                                ? "Loading event presets…"
                                : "No options available."}
                            </p>
                          )}
                        </div>
                      )}
                    </section>
                  );
                })
              : matches.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    disabled={option.disabled}
                    title={option.detail}
                    aria-pressed={option.id === value}
                    onClick={() => {
                      onChange(option.id);
                      close(true);
                    }}
                  >
                    <span className="exploration-option-name">
                      {option.icon && (
                        <img
                          className="country-flag"
                          src={option.icon}
                          alt=""
                          width={24}
                          height={18}
                          loading="lazy"
                        />
                      )}
                      {option.domain && (
                        <DomainIcon domain={option.domain} size={13} />
                      )}
                      <span>{option.name}</span>
                    </span>
                    {option.detail && <small>{option.detail}</small>}
                  </button>
                ))}
            {!matches.length && (
              <p>
                {loading
                  ? "Loading event presets…"
                  : "No matches. Try another name."}
              </p>
            )}
          </div>
          {curated && !term && (
            <button
              className="exploration-catalog-toggle"
              type="button"
              onClick={() => setAll(!all)}
            >
              {all
                ? "Show familiar variables"
                : `Browse full advanced catalog (${options.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

export function PeriodPicker({
  id,
  start,
  end,
  months,
  onChange,
}: {
  id: string;
  start: string;
  end: string;
  months: string[];
  onChange: (period: { start: string; end: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = usePopoverPosition(open);
  useEffect(() => {
    if (!open) return;
    dialog.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="exploration-picker exploration-period"
      ref={root}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && !event.currentTarget.contains(next)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <span className="exploration-control-label" id={`${id}-label`}>
        Study period
      </span>
      <button
        type="button"
        className="exploration-picker-trigger"
        ref={trigger}
        id={id}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? `${id}-dialog` : undefined}
        onClick={() => setOpen(!open)}
      >
        <span id={`${id}-value`}>
          {monthLabel(start)} – {monthLabel(end)}
        </span>
        <CalendarDays size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="exploration-popover exploration-period-popover"
          ref={dialog}
          role="dialog"
          aria-label="Choose study period"
          tabIndex={-1}
          id={`${id}-dialog`}
        >
          <MonthPicker
            id={`${id}-start`}
            label="Period start"
            value={start}
            months={months}
            onChange={(value) =>
              onChange({ start: value, end: value > end ? value : end })
            }
          />
          <MonthPicker
            id={`${id}-end`}
            label="Period end"
            value={end}
            months={months}
            onChange={(value) =>
              onChange({ start: value < start ? value : start, end: value })
            }
          />
          <button
            type="button"
            className="exploration-period-done"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
