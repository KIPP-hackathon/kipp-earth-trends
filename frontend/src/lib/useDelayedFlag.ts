import { useEffect, useRef, useState } from "react";

/**
 * Debounces a busy flag for display. It turns on only after the input has stayed
 * true for `delayMs`, so cached frames that resolve almost instantly never flash
 * a loading state; once shown it stays for at least `minVisibleMs` so it does
 * not blink off right after appearing.
 */
export function createDelayedFlag(
  onChange: (visible: boolean) => void,
  delayMs: number,
  minVisibleMs: number,
) {
  let visible = false;
  let shownAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const set = (next: boolean) => {
    if (next === visible) return;
    visible = next;
    if (next) shownAt = Date.now();
    onChange(next);
  };
  return {
    update(busy: boolean) {
      clearTimeout(timer);
      timer = undefined;
      if (busy) {
        if (!visible) timer = setTimeout(() => set(true), delayMs);
      } else if (visible) {
        const remaining = shownAt + minVisibleMs - Date.now();
        if (remaining > 0) timer = setTimeout(() => set(false), remaining);
        else set(false);
      }
    },
    dispose() {
      clearTimeout(timer);
    },
  };
}

export function useDelayedFlag(busy: boolean, delayMs = 450, minVisibleMs = 350) {
  const [visible, setVisible] = useState(false);
  const flag = useRef<ReturnType<typeof createDelayedFlag> | undefined>(undefined);
  useEffect(() => {
    const current = createDelayedFlag(setVisible, delayMs, minVisibleMs);
    flag.current = current;
    return () => {
      current.dispose();
      if (flag.current === current) flag.current = undefined;
      setVisible(false);
    };
  }, [delayMs, minVisibleMs]);
  useEffect(() => {
    flag.current?.update(busy);
  }, [busy, delayMs, minVisibleMs]);
  return visible;
}
