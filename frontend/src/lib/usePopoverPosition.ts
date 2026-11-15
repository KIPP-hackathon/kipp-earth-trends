import { useLayoutEffect, useRef } from "react";

/** Keep a calendar/dialog visible when Safari pans or resizes its visual viewport. */
export function usePopoverPosition(open: boolean) {
  const dialog = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    let shift = 0;
    const fit = () => {
      const popup = dialog.current;
      if (!popup) return;
      const top = (viewport?.offsetTop ?? 0) + 8;
      const bottom =
        (viewport?.offsetTop ?? 0) +
        (viewport?.height ?? window.innerHeight) - 8;
      popup.style.maxHeight = `${Math.max(0, bottom - top)}px`;
      const bounds = popup.getBoundingClientRect();
      const naturalTop = bounds.top - shift;
      shift = Math.max(
        top - naturalTop,
        Math.min(0, bottom - naturalTop - bounds.height),
      );
      popup.style.setProperty("--popover-shift-y", `${shift}px`);
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, true);
    viewport?.addEventListener("resize", fit);
    viewport?.addEventListener("scroll", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit, true);
      viewport?.removeEventListener("resize", fit);
      viewport?.removeEventListener("scroll", fit);
    };
  }, [open]);
  return dialog;
}
