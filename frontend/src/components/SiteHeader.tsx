import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Earth, Menu, X } from "lucide-react";
import { LabTabs } from "./LabTabs";
import type { LabTab } from "./LabTabs";

export function SiteHeader({
  active,
  onChange,
  children,
}: {
  active: LabTab;
  onChange: (tab: LabTab) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const closeAfterSelection = () => {
    setOpen(false);
    if (window.matchMedia("(max-width: 1160px)").matches)
      requestAnimationFrame(() =>
        toggle.current?.focus({ preventScroll: true }),
      );
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        header.current?.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <header
      ref={header}
      className="site-header has-investigation-actions"
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <a
        href="#"
        className="brand"
        aria-label="KIPP home"
        onClick={(event) => {
          event.preventDefault();
          onChange("explore");
          closeAfterSelection();
        }}
      >
        <span className="brand-mark">
          <Earth size={29} strokeWidth={1.25} />
          <i />
        </span>
        <span>
          KIPP<span className="brand-dot">.</span>
        </span>
      </a>
      <button
        ref={toggle}
        type="button"
        className="site-menu-toggle"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <X size={23} aria-hidden="true" />
        ) : (
          <Menu size={23} aria-hidden="true" />
        )}
      </button>
      <div
        id="site-navigation"
        className={`site-header-menu${open ? " is-open" : ""}`}
      >
        <LabTabs
          active={active}
          onChange={onChange}
          onSelect={closeAfterSelection}
        />
        {children}
      </div>
    </header>
  );
}
