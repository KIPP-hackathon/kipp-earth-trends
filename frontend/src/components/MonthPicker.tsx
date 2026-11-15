import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import "../month-picker.css";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthName = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});
const fullMonth = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
export function MonthPicker({
  id,
  label,
  value,
  months,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  months: string[];
  onChange: (month: string) => void;
}) {
  const available = [
    ...new Set(months.filter((month) => monthPattern.test(month))),
  ].sort();
  const allowed = new Set(available);
  const years = [
    ...new Set(available.map((month) => Number(month.slice(0, 4)))),
  ];
  const selectedYear = monthPattern.test(value)
    ? Number(value.slice(0, 4))
    : (years[0] ?? new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(selectedYear);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const monthButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const calendar = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    if (open && calendar.current && !calendar.current.open)
      calendar.current.showModal();
  }, [open]);
  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const selected = Number(value.slice(5)) - 1;
    const focus = monthButtons.current[selected];
    (focus && !focus.disabled
      ? focus
      : monthButtons.current.find((button) => button && !button.disabled)
    )?.focus({ preventScroll: true });
  }, [open, year]);
  useEffect(() => setOpen(false), [value]);
  const yearIndex = years.indexOf(year);
  return (
    <div
      className="month-picker"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
        }
      }}
      onBlur={(event) => {
        // Safari may blur a button with no next focus target during a tap.
        // Outside pointerdown still dismisses the calendar in that case.
        const next = event.relatedTarget as Node | null;
        if (next && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <span className="month-picker-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        type="button"
        className="month-picker-trigger"
        id={id}
        ref={trigger}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-calendar` : undefined}
        disabled={!available.length}
        onClick={() => {
          if (!open) {
            setYear(selectedYear);
          }
          setOpen((previous) => !previous);
        }}
      >
        <span id={`${id}-value`}>
          {monthPattern.test(value)
            ? fullMonth.format(new Date(`${value}-01T00:00:00Z`))
            : "Unavailable"}
        </span>
        <CalendarDays size={16} aria-hidden="true" />
      </button>
      {open && (
        <dialog
          className="month-calendar"
          ref={calendar}
          onCancel={(event) => { event.preventDefault(); close(true); }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const box = event.currentTarget.getBoundingClientRect();
            if (event.clientX < box.left || event.clientX > box.right ||
                event.clientY < box.top || event.clientY > box.bottom) close(true);
          }}
          aria-label={`${label}: choose month`}
          id={`${id}-calendar`}
        >
          <h3 className="month-calendar-title">{label}</h3>
          <div className="month-calendar-year">
            <button
              type="button"
              aria-label="Previous available year"
              disabled={yearIndex <= 0}
              onClick={() => setYear(years[yearIndex - 1])}
            >
              <ChevronLeft size={17} />
            </button>
            <select aria-label={`${label}: year`} value={year}
              onChange={(event) => setYear(Number(event.target.value))}>
              {years.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            <button
              type="button"
              aria-label="Next available year"
              disabled={yearIndex < 0 || yearIndex >= years.length - 1}
              onClick={() => setYear(years[yearIndex + 1])}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div
            className="month-calendar-grid"
            role="group"
            aria-label={`Available months in ${year}`}
          >
            {Array.from({ length: 12 }, (_, index) => {
              const month = `${year}-${String(index + 1).padStart(2, "0")}`;
              const date = new Date(`${month}-01T00:00:00Z`);
              return (
                <button
                  type="button"
                  key={month}
                  ref={(element) => {
                    monthButtons.current[index] = element;
                  }}
                  disabled={!allowed.has(month)}
                  aria-label={fullMonth.format(date)}
                  aria-pressed={month === value}
                  onClick={() => {
                    if (!allowed.has(month)) return;
                    onChange(month);
                    close(true);
                  }}
                  onKeyDown={(event) => {
                    const step = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -3,
                      ArrowDown: 3,
                    }[event.key];
                    if (!step) return;
                    event.preventDefault();
                    for (
                      let next = index + step;
                      next >= 0 && next < 12;
                      next += step
                    ) {
                      const candidate = monthButtons.current[next];
                      if (candidate && !candidate.disabled) {
                        candidate.focus();
                        break;
                      }
                    }
                  }}
                >
                  {monthName.format(date)}
                </button>
              );
            })}
          </div>
          <p className="month-calendar-note">
            Monthly data. Unavailable months are disabled.
          </p>
          <button type="button" className="month-calendar-cancel"
            aria-label="Close calendar" onClick={() => close(true)}>Cancel</button>
        </dialog>
      )}
    </div>
  );
}
