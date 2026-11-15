import type { ReactNode } from "react";
import "./loading.css";

/** Decorative so a parent status or button can supply one useful announcement. */
export function LoadingIcon({ large = false }: { large?: boolean }) {
  return (
    <span className={`loading-orbit${large ? " is-large" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none" focusable="false">
        <circle className="loading-orbit-track" cx="20" cy="20" r="16" />
        <g className="loading-orbit-spin">
          <circle className="loading-orbit-arc" cx="20" cy="20" r="16" />
          <circle className="loading-orbit-satellite" cx="20" cy="4" r="2.5" />
        </g>
        <circle className="loading-orbit-core" cx="20" cy="20" r="5" />
      </svg>
    </span>
  );
}

export function LoadingStatus({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`loading-status ${className}`} role="status" aria-atomic="true">
      <LoadingIcon />
      <span>{children}</span>
    </div>
  );
}

export function LoadingState({
  title,
  detail,
  className = "",
}: {
  title: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={`loading-state ${className}`} role="status" aria-atomic="true">
      <LoadingIcon large />
      <div className="loading-state-copy">
        <span className="loading-state-eyebrow">WORKING ON IT</span>
        <h3>{title}</h3>
        {detail && <p>{detail}</p>}
      </div>
      <div className="loading-placeholder" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  );
}
