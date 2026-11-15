import { ArrowRight, MessageCircle } from "lucide-react";
import { KippMascot } from "./KippMascot";
import { journeyGuidance } from "../lib/journeyGuidance";
import type { PanelSnapshot } from "../lib/assistant";
import type { LabTab } from "./LabTabs";
import "./single-page-journey.css";

export function JourneyGuide({
  stage,
  panel,
  onAsk,
  onNavigate,
}: {
  stage: LabTab;
  panel?: PanelSnapshot;
  onAsk: (prompt?: string) => void;
  onNavigate: (tab: LabTab) => void;
}) {
  const tip = journeyGuidance(stage, panel);
  return (
    <aside className="journey-agent" aria-label="KIPP investigation guide">
      <KippMascot animated />
      <div className="journey-agent-copy">
        <span className="journey-eyebrow">
          KIPP · YOUR AI INVESTIGATION GUIDE
        </span>
        <h2>{tip.title}</h2>
        <p>{tip.detail}</p>
        <small>
          Interface guidance · numerical conclusions require data and method
          checks.
        </small>
      </div>
      <div className="journey-agent-actions">
        <button type="button" onClick={() => onAsk(tip.prompt)}>
          <MessageCircle size={17} /> Ask KIPP
        </button>
        <button type="button" onClick={() => onNavigate(tip.next)}>
          {tip.nextLabel}
          <ArrowRight size={15} />
        </button>
      </div>
    </aside>
  );
}
export function JourneyStepHeading({
  number,
  title,
  detail,
  onAsk,
}: {
  number: string;
  title: string;
  detail: string;
  onAsk: () => void;
}) {
  return (
    <header className="journey-section-heading">
      <div>
        <span className="journey-eyebrow">
          {number} · INVESTIGATION JOURNEY
        </span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      <button type="button" onClick={onAsk}>
        <MessageCircle size={15} /> Guide me through this step
      </button>
    </header>
  );
}
