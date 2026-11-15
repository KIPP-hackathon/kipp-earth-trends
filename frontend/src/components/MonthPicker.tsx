import { useId } from "react";
import "../month-picker.css";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" });

/** Native selects use the same iOS controls for period limits and the timeline. */
export function MonthPicker({ id, label, value, months, onChange }: {
  id: string;
  label: string;
  value: string;
  months: string[];
  onChange: (month: string) => void;
}) {
  const helpId = useId();
  const available = [...new Set(months.filter(month => monthPattern.test(month)))].sort();
  const selected = available.includes(value) ? value : available[0] ?? "";
  const year = selected.slice(0, 4);
  const years = [...new Set(available.map(month => month.slice(0, 4)))];
  const yearMonths = available.filter(month => month.startsWith(`${year}-`));
  return (
    <div className="month-picker" role="group" aria-labelledby={`${id}-label`}>
      <span className="month-picker-label" id={`${id}-label`}>{label}</span>
      <div className="month-picker-selects">
        <select id={id} aria-label={`${label}: month`} disabled={!available.length}
          value={selected} aria-describedby={helpId}
          onChange={event => onChange(event.target.value)}>
          {yearMonths.map(month => <option key={month} value={month}>
            {monthName.format(new Date(`${month}-01T00:00:00Z`))}
          </option>)}
        </select>
        <select aria-label={`${label}: year`} disabled={!available.length} value={year}
          aria-describedby={helpId}
          onChange={event => {
            const nextYear = event.target.value;
            const sameMonth = `${nextYear}-${selected.slice(5)}`;
            const next = available.includes(sameMonth) ? sameMonth : available.find(month => month.startsWith(`${nextYear}-`));
            if (next) onChange(next);
          }}>
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
      <span className="sr-only" id={helpId}>Monthly data. Only months with available observations are listed.</span>
    </div>
  );
}
