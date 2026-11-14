import {
  BookOpen,
  ChartNoAxesCombined,
  Columns2,
  Earth,
  MapPinned,
} from "lucide-react";

export const labTabs = [
  { id: "explore", label: "Explorar", icon: Earth },
  { id: "compare", label: "Comparar", icon: Columns2 },
  { id: "events", label: "Eventos", icon: MapPinned },
  { id: "analysis", label: "Análise", icon: ChartNoAxesCombined },
  { id: "learn", label: "Como funciona", icon: BookOpen },
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
    <div className="lab-tabs" role="tablist" aria-label="Áreas do laboratório">
      {labTabs.map(({ id, label, icon: Icon }, index) => (
        <button
          key={id}
          id={`tab-${id}`}
          role="tab"
          type="button"
          aria-selected={active === id}
          aria-controls={`panel-${id}`}
          tabIndex={active === id ? 0 : -1}
          onClick={() => onChange(id)}
          onKeyDown={(e) => {
            let next = index;
            if (e.key === "ArrowRight") next = (index + 1) % labTabs.length;
            else if (e.key === "ArrowLeft")
              next = (index + labTabs.length - 1) % labTabs.length;
            else if (e.key === "Home") next = 0;
            else if (e.key === "End") next = labTabs.length - 1;
            else return;
            e.preventDefault();
            onChange(labTabs[next].id);
            document.getElementById(`tab-${labTabs[next].id}`)?.focus();
          }}
        >
          <Icon size={17} strokeWidth={1.5} />
          <span>{label}</span>
          {id === "compare" && <small>A / B</small>}
        </button>
      ))}
    </div>
  );
}
