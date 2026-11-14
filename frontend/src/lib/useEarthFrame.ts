import { useEffect, useState } from "react";
import type { EarthFrame, EarthVariable } from "./earthApi";
import { followingMonths, frameKey, requestFrame } from "./earthFrameCache";

export function useEarthFrame(
  variable: EarthVariable,
  month: string,
  lookAhead = 3,
  bbox?: string,
  active = true,
) {
  const key = frameKey(variable, month, bbox);
  const compatibility = frameKey(variable, "", bbox);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key?: string;
    compatibility?: string;
    attempt?: number;
    data?: EarthFrame;
    error?: string;
  }>({});
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    requestFrame(variable, month, controller.signal, "foreground", bbox).then(
      (data) => {
        if (!controller.signal.aborted)
          setState({ key, compatibility, attempt, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            key,
            compatibility,
            attempt,
            data:
              previous.compatibility === compatibility
                ? previous.data
                : undefined,
            error:
              error instanceof Error
                ? error.message
                : "Falha ao consultar campo real.",
          }));
      },
    );
    return () => controller.abort();
    // The serialized key includes the rendering policy and every frame parameter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, active]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    for (const next of followingMonths(
      variable,
      month,
      Math.max(0, Math.min(3, lookAhead)),
    )) {
      void requestFrame(
        variable,
        next,
        controller.signal,
        "background",
        bbox,
      ).catch(() => {});
    }
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lookAhead, active]);
  const current = state.key === key && state.attempt === attempt;
  return {
    data: state.compatibility === compatibility ? state.data : undefined,
    loading: active && !current,
    error: current ? state.error : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}
