import { useCallback, useEffect, useRef, useState } from "react";
import type { GlobeView } from "./comparison";

const durationMs = 900;
const wrap = (longitude: number) =>
  ((((longitude + 180) % 360) + 360) % 360) - 180;

export function interpolateCamera(
  from: GlobeView,
  to: GlobeView,
  progress: number,
): GlobeView {
  if (progress >= 1) return to;
  if (progress <= 0) return from;
  const eased = progress * progress * (3 - 2 * progress);
  return {
    longitude: wrap(
      from.longitude + wrap(to.longitude - from.longitude) * eased,
    ),
    latitude: from.latitude + (to.latitude - from.latitude) * eased,
    zoom: from.zoom + (to.zoom - from.zoom) * eased,
    showLayer: to.showLayer,
  };
}

export function useGlobeCamera(initial: GlobeView) {
  const [view, render] = useState(initial);
  const current = useRef(initial);
  const destination = useRef(initial);
  const frame = useRef<number | null>(null);
  const reducedMotion = useRef(false);
  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  const update = useCallback((next: GlobeView) => {
    current.current = next;
    render(next);
  }, []);
  const setView = useCallback(
    (next: GlobeView) => {
      cancel();
      destination.current = next;
      update(next);
    },
    [cancel, update],
  );
  const flyTo = useCallback(
    (next: GlobeView) => {
      cancel();
      const from = current.current;
      destination.current = next;
      if (
        reducedMotion.current ||
        (Math.abs(wrap(next.longitude - from.longitude)) < 1e-8 &&
          Math.abs(next.latitude - from.latitude) < 1e-8 &&
          Math.abs(next.zoom - from.zoom) < 1e-8)
      ) {
        update(next);
        return;
      }
      const started = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, Math.max(0, (now - started) / durationMs));
        update(interpolateCamera(from, next, progress));
        frame.current = progress < 1 ? requestAnimationFrame(tick) : null;
      };
      frame.current = requestAnimationFrame(tick);
    },
    [cancel, update],
  );
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = preference.matches;
    const changed = () => {
      reducedMotion.current = preference.matches;
      if (preference.matches && frame.current !== null)
        setView(destination.current);
    };
    preference.addEventListener("change", changed);
    return () => {
      preference.removeEventListener("change", changed);
      cancel();
    };
  }, [cancel, setView]);
  return { view, setView, flyTo };
}
