import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

/** Actual request stages and elapsed time, never an invented completion percentage. */
export function DataLoading({
  catalogReady,
  configReady,
}: {
  catalogReady: boolean;
  configReady: boolean;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section
      className="data-loading"
      aria-label="Preparing real data"
      aria-busy="true"
    >
      <LoaderCircle
        size={23}
        className="data-loading-spinner"
        aria-hidden="true"
      />
      <div>
        <p role="status">Preparing your investigation</p>
        <ul>
          {[
            ["Available variables and monthly coverage", catalogReady],
            ["Study areas and methods", configReady],
          ].map(([label, ready]) => (
            <li key={String(label)}>
              {ready ? (
                <Check size={13} aria-hidden="true" />
              ) : (
                <span className="data-loading-dot" aria-hidden="true" />
              )}
              {label}
              <span>{ready ? "Ready" : "Loading…"}</span>
            </li>
          ))}
        </ul>
        <small>
          {seconds < 8
            ? "You can read the introduction while the real-data catalog loads."
            : "The data source is taking longer to respond. A cold catalog request can take around a minute; no simulated values will be substituted."}{" "}
          <span aria-hidden="true">{seconds}s elapsed</span>
        </small>
      </div>
    </section>
  );
}
