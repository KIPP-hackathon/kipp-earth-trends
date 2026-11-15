import { useCallback, useRef, useState } from "react";

/**
 * Tracks an element's rendered width so SVG charts can draw at 1:1 pixels
 * (like TrendChart) instead of scaling a fixed viewBox up and enlarging text.
 * Returns a callback ref, so it also works for elements that mount later.
 */
export function useMeasuredWidth<T extends Element>(initial = 800) {
  const [width, setWidth] = useState(initial);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    // Hidden workspaces report zero; keep the last usable width.
    const update = (w: number) => {
      if (w > 0) setWidth((p) => (Math.abs(p - w) > 0.5 ? w : p));
    };
    update(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(([entry]) => {
      if (entry) update(entry.contentRect.width);
    });
    observer.current.observe(el);
  }, []);
  return [ref, width] as const;
}
