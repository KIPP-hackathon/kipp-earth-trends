import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export type GuidedStep = {
  id: string;
  title: string;
  body: ReactNode;
  /** CSS selector of the element to spotlight; centred card when absent. */
  target?: string;
  /** Follow the target’s open picker instead of dimming its menu. */
  followDialog?: boolean;
  /** Extra buttons shown in the card (e.g. "Run an example for me"). */
  actions?: ReactNode;
  /** When false, Next is disabled (e.g. until results exist). */
  canNext?: boolean;
  /** Hint shown next to a disabled Next button. */
  waitHint?: string;
};

type Box = { top: number; left: number; width: number; height: number };
const gap = 12,
  margin = 12,
  pad = 6;

/**
 * Spotlight tour: dims the page, outlines the step's target, scrolls it into
 * view and places the step card beside it. The page stays interactive.
 */
export function GuidedTour({
  steps,
  step,
  onStep,
  onClose,
  onFinish,
  dismissActions,
}: {
  steps: GuidedStep[];
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
  onFinish?: () => void;
  dismissActions?: ReactNode;
}) {
  const current = steps[Math.min(step, steps.length - 1)];
  const card = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  // The card moves and the page scrolls on every step; briefly swallow
  // clicks so a quick second click cannot land on the page underneath.
  const [shield, setShield] = useState(true);
  useEffect(() => {
    setShield(true);
    const timer = window.setTimeout(() => setShield(false), 450);
    return () => window.clearTimeout(timer);
  }, [step]);

  // Scroll the target into view when the step changes (or it appears later).
  useEffect(() => {
    let tries = 0;
    let timer = 0;
    let lifted: HTMLElement | null = null;
    const scroll = () => {
      const el = current.target
        ? document.querySelector<HTMLElement>(current.target)
        : null;
      if (el) {
        // Lift the target above the dim layer so its menus stay usable.
        el.classList.add("guided-tour-target");
        lifted = el;
        const tall = el.getBoundingClientRect().height > innerHeight * 0.6;
        el.scrollIntoView({
          block: tall ? "start" : "center",
          behavior: "smooth",
        });
      } else if (current.target && tries++ < 20) {
        timer = window.setTimeout(scroll, 150);
      }
    };
    scroll();
    return () => {
      window.clearTimeout(timer);
      lifted?.classList.remove("guided-tour-target");
    };
  }, [current.id, current.target]);

  // Track the target and card geometry every frame while the tour is open.
  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      const el = current.target
        ? document.querySelector<HTMLElement>(current.target)
        : null;
      const dialog = current.followDialog ? el?.querySelector<HTMLElement>('[role="dialog"]') : null;
      const dialogBox = dialog?.getBoundingClientRect();
      const r = dialogBox && dialogBox.width > 0 && dialogBox.height > 0
        ? dialogBox : el?.getBoundingClientRect();
      const visible = r && r.width > 0 && r.height > 0;
      const next: Box | null = visible
        ? {
            top: r.top - pad,
            left: r.left - pad,
            width: r.width + pad * 2,
            height: r.height + pad * 2,
          }
        : null;
      const c = card.current?.getBoundingClientRect();
      const w = c?.width ?? 340,
        h = c?.height ?? 200;
      let top: number, left: number;
      if (!next) {
        top = (innerHeight - h) / 2;
        left = (innerWidth - w) / 2;
      } else {
        // Prefer beside the target so its dropdowns stay uncovered.
        const right = next.left + next.width + gap;
        const leftSide = next.left - gap - w;
        const below = next.top + next.height + gap;
        const above = next.top - gap - h;
        if (right + w <= innerWidth - margin) {
          left = right;
          top = next.top;
        } else if (leftSide >= margin) {
          left = leftSide;
          top = next.top;
        } else {
          top =
            below + h <= innerHeight - margin
              ? below
              : above >= margin
                ? above
                : innerHeight - h - margin;
          left = next.left;
        }
      }
      left = Math.min(Math.max(margin, left), innerWidth - w - margin);
      top = Math.min(Math.max(margin, top), innerHeight - h - margin);
      setBox((b) =>
        b?.top === next?.top &&
        b?.left === next?.left &&
        b?.width === next?.width &&
        b?.height === next?.height
          ? b
          : next,
      );
      setPos((p) => (p?.top === top && p?.left === left ? p : { top, left }));
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [current.target, current.followDialog]);

  const positioned = pos !== null;
  useEffect(() => {
    if (positioned) card.current?.focus({ preventScroll: true });
  }, [current.id, positioned]);

  const last = step >= steps.length - 1;
  const canNext = current.canNext !== false;
  return (
    <div className="guided-tour" aria-live="polite">
      {shield && <div className="guided-tour-shield" aria-hidden="true" />}
      {box ? (
        <div
          className="guided-tour-spotlight"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
          }}
        />
      ) : (
        <div className="guided-tour-dim" />
      )}
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-label={`Guided tour, step ${step + 1} of ${steps.length}: ${current.title}`}
        className="guided-tour-card"
        style={
          pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }
        }
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowRight" && !last && canNext) onStep(step + 1);
          if (e.key === "ArrowLeft" && step > 0) onStep(step - 1);
        }}
      >
        <div className="guided-tour-head">
          <span className="trend-kicker">
            Guided tour · {step + 1} / {steps.length}
          </span>
          <button type="button" aria-label="Close tour" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <strong>{current.title}</strong>
        <div className="guided-tour-body">{current.body}</div>
        {current.actions && (
          <div className="guided-tour-actions">{current.actions}</div>
        )}
        {!canNext && current.waitHint && (
          <small className="guided-tour-wait">{current.waitHint}</small>
        )}
        <div className="guided-tour-nav">
          <div className="guided-tour-dots" aria-hidden="true">
            {steps.map((s, i) => (
              <i key={s.id} data-active={i === step} data-done={i < step} />
            ))}
          </div>
          <button
            type="button"
            disabled={step === 0}
            onClick={() => onStep(step - 1)}
          >
            Back
          </button>
          <button
            type="button"
            className="guided-tour-next"
            disabled={!last && !canNext}
            onClick={() => (last ? (onFinish ?? onClose)() : onStep(step + 1))}
          >
            {last ? "Finish" : "Next"}
          </button>
        </div>
        {dismissActions && <div className="guided-tour-dismiss">{dismissActions}</div>}
      </div>
    </div>
  );
}
