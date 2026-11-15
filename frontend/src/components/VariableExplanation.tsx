import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";

/** Portal keeps explanations outside the table's scrolling/clipping boundary. */
export function VariableExplanation({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [position, setPosition] = useState<CSSProperties>();
  const cancelClose = () => clearTimeout(timer.current);
  const close = () => {
    cancelClose();
    setPosition(undefined);
  };
  const open = () => {
    cancelClose();
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom >= 180 || rect.top < 180;
    const width = Math.min(340, window.innerWidth - 24);
    setPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width,
      ...(below
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
      maxHeight: Math.max(
        80,
        Math.min(
          300,
          (below ? window.innerHeight - rect.bottom : rect.top) - 20,
        ),
      ),
    });
  };
  const scheduleClose = () => {
    cancelClose();
    timer.current = setTimeout(() => setPosition(undefined), 150);
  };
  const isOpen = Boolean(position);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event: Event) => {
      if (event.type === "keydown" && (event as KeyboardEvent).key !== "Escape")
        return;
      if (
        event.type !== "keydown" &&
        event.target instanceof Node &&
        (trigger.current?.contains(event.target) ||
          popup.current?.contains(event.target))
      )
        return;
      clearTimeout(timer.current);
      setPosition(undefined);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [isOpen]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="runtime-variable-name"
        aria-describedby={isOpen ? id : undefined}
        onPointerEnter={open}
        onPointerLeave={scheduleClose}
        onFocus={open}
        onBlur={close}
        onClick={open}
      >
        {name}
      </button>
      {position &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="tooltip"
            className="runtime-variable-explanation"
            style={position}
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
          >
            <strong>{name}</strong>
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
