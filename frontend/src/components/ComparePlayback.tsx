import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Link2, Pause, Play } from "lucide-react";
import type { PanelSide } from "../lib/assistant";
import { realMonth } from "../lib/earthApi";
import {
  commonPlaybackMonths,
  runComparisonPlayback,
} from "../lib/comparePlayback";
import type { ComparePlaybackPanel } from "../lib/comparePlayback";
import "./compare-playback.css";

type JointPlayback = {
  playing: boolean;
  preparing: boolean;
  stop: () => void;
  report: (side: PanelSide, panel?: ComparePlaybackPanel) => void;
};
const Context = createContext<JointPlayback | null>(null);
export const useComparePlayback = () => useContext(Context);
type PanelMeta = Pick<
  ComparePlaybackPanel,
  "months" | "month" | "loading" | "error" | "playing"
>;

export function ComparePlayback({
  active,
  cadenceMs,
  children,
}: {
  active: boolean;
  cadenceMs: number;
  children: ReactNode;
}) {
  const panels = useRef<Partial<Record<PanelSide, ComparePlaybackPanel>>>({});
  const controller = useRef<AbortController | null>(null);
  const [metadata, setMetadata] = useState<
    Partial<Record<PanelSide, PanelMeta>>
  >({});
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [sameMonth, setSameMonth] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");
  const stop = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setPlaying(false);
    setPreparing(false);
  }, []);
  const report = useCallback(
    (side: PanelSide, panel?: ComparePlaybackPanel) => {
      const previous = panels.current[side];
      if (
        controller.current &&
        (!panel || (previous && previous.studyKey !== panel.studyKey))
      )
        stop();
      if (panel) panels.current[side] = panel;
      else delete panels.current[side];
      const meta = panel
        ? {
            months: panel.months,
            month: panel.month,
            loading: panel.loading,
            error: panel.error,
            playing: panel.playing,
          }
        : undefined;
      setMetadata((current) =>
        JSON.stringify(current[side]) === JSON.stringify(meta)
          ? current
          : { ...current, [side]: meta },
      );
    },
    [stop],
  );
  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      controller.current?.abort();
    };
  }, [stop]);
  const common = commonPlaybackMonths(
    metadata.A?.months ?? [],
    metadata.B?.months ?? [],
  );
  const missing = !metadata.A?.months.length || !metadata.B?.months.length;
  const short =
    (metadata.A?.months.length ?? 0) < 2 ||
    (metadata.B?.months.length ?? 0) < 2;
  const loading = metadata.A?.loading || metadata.B?.loading;
  const sourceError = metadata.A?.error || metadata.B?.error;
  const disabledReason = missing
    ? "Choose variables in both panels to play them together."
    : short
      ? "Both panels need at least two available months."
      : sameMonth && common.length < 2
        ? "Fewer than two common months. Turn off Same month or change the study periods."
        : sourceError
          ? "Retry the failed map source before playing both panels."
          : loading
            ? "Loading the selected months…"
            : "";
  const start = (atSpeed = speed) => {
    const { A, B } = panels.current;
    if (!A || !B || (!playing && disabledReason) || !active) return;
    stop();
    setError("");
    A.pause();
    B.pause();
    A.setSpeed(atSpeed);
    B.setSpeed(atSpeed);
    const run = new AbortController();
    controller.current = run;
    setPlaying(true);
    void runComparisonPlayback(
      { A, B },
      {
        sameMonth,
        cadenceMs: cadenceMs / atSpeed,
        signal: run.signal,
        onPreparing: (value) => {
          if (controller.current === run && !run.signal.aborted)
            setPreparing(value);
        },
      },
    ).catch((failure) => {
      if (run.signal.aborted) return;
      stop();
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not prepare both panels.",
      );
    });
  };
  const anyPlaying = playing || metadata.A?.playing || metadata.B?.playing;
  const pauseBoth = () => {
    stop();
    panels.current.A?.pause();
    panels.current.B?.pause();
  };
  const value = useMemo(
    () => ({ playing, preparing, stop, report }),
    [playing, preparing, stop, report],
  );
  return (
    <Context.Provider value={value}>
      <div
        className="compare-playback"
        role="group"
        aria-label="Joint playback for both panels"
      >
        <div className="compare-playback-controls">
          <button
            type="button"
            className="compare-playback-toggle"
            aria-pressed={!!anyPlaying}
            disabled={!anyPlaying && !!disabledReason}
            title={
              !anyPlaying
                ? disabledReason || "Play both panels"
                : "Pause both panels"
            }
            onClick={() => (anyPlaying ? pauseBoth() : start())}
          >
            {anyPlaying ? <Pause size={16} /> : <Play size={16} />}
            {anyPlaying ? "Pause both" : "Play both"}
          </button>
          <label>
            Speed
            <select
              aria-label="Playback speed for both panels"
              value={speed}
              onChange={(event) => {
                stop();
                const next = Number(event.target.value);
                setSpeed(next);
                panels.current.A?.setSpeed(next);
                panels.current.B?.setSpeed(next);
                if (playing) start(next);
              }}
            >
              {[0.5, 1, 2, 4].map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </label>
          <label className="compare-playback-sync">
            <input
              type="checkbox"
              checked={sameMonth}
              disabled={!sameMonth && common.length < 2}
              onChange={(event) => {
                stop();
                setSameMonth(event.target.checked);
                setError("");
              }}
            />
            <Link2 size={14} /> Same month
          </label>
        </div>
        <div
          className="compare-playback-dates"
          aria-label="Current comparison months"
        >
          <span>
            <b>A</b>{" "}
            {metadata.A?.month
              ? realMonth(metadata.A.month)
              : "Choose variables"}
          </span>
          <span>
            <b>B</b>{" "}
            {metadata.B?.month
              ? realMonth(metadata.B.month)
              : "Choose variables"}
          </span>
        </div>
        <p
          className="compare-playback-status"
          role={error ? "alert" : "status"}
        >
          {error ||
            (playing
              ? preparing
                ? "Preparing both panels…"
                : "Playing both panels"
              : anyPlaying
                ? "Individual playback · use Pause both to stop both panels"
                : disabledReason ||
                  (sameMonth
                    ? `${common.length} common months · dates advance together`
                    : "Each panel follows its own study period"))}
        </p>
      </div>
      {children}
    </Context.Provider>
  );
}
