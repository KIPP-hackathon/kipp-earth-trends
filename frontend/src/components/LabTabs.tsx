import {
  BookOpen,
  Compass,
  Columns2,
  Earth,
  FlaskConical,
  MapPinned,
} from "lucide-react";

export const labTabs = [
  { id: "start", label: "Introduction", icon: Compass },
  { id: "events", label: "Events", icon: MapPinned },
  { id: "trend", label: "Trend Lab", icon: FlaskConical },
  { id: "explore", label: "Explore", icon: Earth },
  { id: "compare", label: "Compare", icon: Columns2 },
  { id: "learn", label: "Guide", icon: BookOpen },
] as const;
export type LabTab = (typeof labTabs)[number]["id"];

export function LabTabs({
  active,
  onChange,
}: {
  active: LabTab;
  onChange: (tab: LabTab) => void;
}) {
  return (
    <nav
      className="lab-tabs journey-navigation"
      aria-label="Investigation journey"
    >
      {labTabs.map(({ id, label, icon: Icon }, index) => (
        <a
          key={id}
          id={`tab-${id}`}
          href={`#panel-${id}`}
          aria-current={active === id ? "step" : undefined}
          onClick={(event) => {
            event.preventDefault();
            onChange(id);
          }}
        >
          <Icon size={16} strokeWidth={1.5} />
          <span>
            {index < 4 && <small>0{index + 1} </small>}
            {label}
          </span>
        </a>
      ))}
    </nav>
  );
}
