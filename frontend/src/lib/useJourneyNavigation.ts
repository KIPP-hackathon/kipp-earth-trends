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
      pending.current = focusSection(tab) ? undefined : tab;
    },
    [open, onManualChange],
  );
  useEffect(() => {
    if (!pending.current) return;
    if (focusSection(pending.current)) pending.current = undefined;
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
    let frame = 0;
    const inspect = () => {
      frame = 0;
      if (pending.current) return;
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
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(frame);
    };
  }, [ready, open, onManualChange]);
  return { active, opened, navigate };
}
