import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Search } from "lucide-react";
import { MonthPicker } from "./MonthPicker";

export type SearchOption = {
  id: string;
  name: string;
  detail?: string;
  disabled?: boolean;
  suggested?: boolean;
};

export function SearchPicker({
  id,
  label,
  value,
  options,
  onChange,
  curated = false,
}: {
  id: string;
  label: string;
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  curated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const close = (focus = false) => {
    setOpen(false);
    if (focus) trigger.current?.focus();
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
  const selected = options.find((option) => option.id === value);
  const term = query.trim().toLocaleLowerCase();
  const matches = options.filter((option) =>
    term
      ? `${option.name} ${option.detail ?? ""} ${option.id}`
          .toLocaleLowerCase()
          .includes(term)
      : !curated || all || option.suggested || option.id === value,
  );
  return (
    <div
      className="exploration-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          close();
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
        onClick={() => {
          setQuery("");
          setOpen(!open);
        }}
      >
        <span id={`${id}-value`}>{selected?.name ?? value}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="exploration-popover exploration-search-popover"
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          id={`${id}-dialog`}
        >
          <label className="exploration-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={search}
              type="search"
              value={query}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label.toLowerCase()}`}
              onChange={(event) => setQuery(event.target.value)}
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
          <p className="exploration-picker-note">
            {curated && !all && !term
              ? "Start with a familiar variable, or search the full catalog."
              : `${matches.length} matching ${label.toLowerCase()} options`}
          </p>
          <div
            className="exploration-options"
            role="group"
            aria-label={`${label} options`}
          >
            {matches.map((option) => (
              <button
                type="button"
                key={option.id}
                disabled={option.disabled}
                aria-pressed={option.id === value}
                onClick={() => {
                  onChange(option.id);
                  close(true);
                }}
              >
                <span>{option.name}</span>
                {option.detail && <small>{option.detail}</small>}
              </button>
            ))}
            {!matches.length && <p>No matches. Try another name or source.</p>}
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
  useEffect(() => {
    if (!open) return;
    root.current
      ?.querySelector<HTMLButtonElement>(".month-picker-trigger")
      ?.focus();
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
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
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
          role="dialog"
          aria-label="Choose study period"
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
