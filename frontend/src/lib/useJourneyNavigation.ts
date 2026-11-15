import { useCallback, useEffect, useRef, useState } from "react";
import { labTabs } from "../components/LabTabs";
import type { LabTab } from "../components/LabTabs";

function focusSection(tab: LabTab) {
  const element = document.getElementById(`panel-${tab}`);
  if (!element) return false;
  element.scrollIntoView({ block: "start", behavior: "instant" });
  element.tabIndex = -1;
  element.focus({ preventScroll: true });
  return true;
}

export function useJourneyNavigation(
  ready: boolean,
  onManualChange: () => void,
) {
  const anchor =
    typeof location === "undefined" ? "" : location.hash.replace("#panel-", "");
  const initial = labTabs.find((tab) => tab.id === anchor)?.id ?? "start";
  const [active, setActive] = useState<LabTab>(initial);
  const activeRef = useRef(active);
  const anchored = useRef<LabTab | undefined>(undefined);
  const [opened, setOpened] = useState<Set<LabTab>>(() => new Set([initial]));
  const pending = useRef<LabTab | undefined>(
    initial === "start" ? undefined : initial,
  );
  const open = useCallback(
    (tab: LabTab) =>
      setOpened((previous) =>
        previous.has(tab) ? previous : new Set([...previous, tab]),
      ),
    [],
  );
  const navigate = useCallback(
    (tab: LabTab) => {
      onManualChange();
      activeRef.current = tab;
      setActive(tab);
      open(tab);
      anchored.current = tab;
      pending.current = focusSection(tab) ? undefined : tab;
    },
    [open, onManualChange],
  );
  useEffect(() => {
    if (!pending.current) return;
    if (focusSection(pending.current)) {
      anchored.current = pending.current;
      pending.current = undefined;
    }
  });
  useEffect(() => {
    const sections = labTabs.flatMap((tab) => {
      const element = document.getElementById(`panel-${tab.id}`);
      return element ? [{ id: tab.id, element }] : [];
    });
    const near = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            open(entry.target.id.replace("panel-", "") as LabTab);
        }),
      { rootMargin: "250px 0px" },
    );
    sections.forEach(({ element }) => near.observe(element));
    // Earlier sections can grow after lazy modules/events arrive. Keep an
    // explicit anchor at its target until the next deliberate user interaction.
    const resize = new ResizeObserver(() => {
      if (anchored.current) focusSection(anchored.current);
    });
    sections.forEach(({ element }) => resize.observe(element));
    const release = () => {
      anchored.current = undefined;
    };
    const interactions = [
      "wheel",
      "touchstart",
      "pointerdown",
      "keydown",
    ] as const;
    interactions.forEach((type) =>
      window.addEventListener(type, release, { passive: true }),
    );
    let frame = 0;
    const inspect = () => {
      frame = 0;
      if (pending.current || anchored.current) return;
      const current =
        sections
          .filter(
            ({ element }) =>
              element.getBoundingClientRect().top <=
              Math.min(260, innerHeight * 0.32),
          )
          .at(-1)?.id ?? "start";
      if (current !== activeRef.current) {
        onManualChange();
        activeRef.current = current;
        setActive(current);
        open(current);
      }
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(inspect);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      near.disconnect();
      resize.disconnect();
      interactions.forEach((type) => window.removeEventListener(type, release));
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(frame);
    };
  }, [ready, open, onManualChange]);
  return { active, opened, navigate };
}
