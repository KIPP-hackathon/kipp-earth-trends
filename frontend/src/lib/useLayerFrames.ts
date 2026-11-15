import {useEffect, useState} from "react";
import type {EarthFrame, EarthVariable} from "./earthApi";
import {variableDataKey} from "./earthApi";
import {frameKey, requestFrame} from "./earthFrameCache";

/** Commit one coherent month across layers; never mix dates while buffering. */
export function useLayerFrames(variables: EarthVariable[], month: string, active: boolean,
  selectedVariables: EarthVariable[] = variables) {
  const selectedSources = new Map(selectedVariables.map(v => [v.id,variableDataKey(v)]));
  const key = JSON.stringify([month,variables.map(v => frameKey(v, month))]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string; attempt: number; month: string; sourceKeys: Record<string,string>;
    frames: Record<string, EarthFrame>; errors: Record<string, string>;
  }>();
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void Promise.allSettled(variables.map(v => requestFrame(v, month, controller.signal, "foreground")))
      .then(results => {
        if (controller.signal.aborted) return;
        const frames: Record<string, EarthFrame> = {}, errors: Record<string, string> = {};
        results.forEach((result,index) => {
          if (result.status === "fulfilled") frames[variables[index].id] = result.value;
          else errors[variables[index].id] = result.reason instanceof Error
            ? result.reason.message : "Could not load this map layer.";
        });
        setState({key, attempt, month, sourceKeys:Object.fromEntries(variables.map(v => [v.id,variableDataKey(v)])), frames, errors});
      });
    return () => controller.abort();
    // Keys contain source revision, rendering policy and requested month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, attempt]);
  const current = state?.key === key && state.attempt === attempt;
  const frames: Record<string,EarthFrame> = Object.fromEntries(Object.entries(state?.frames ?? {})
    .filter(([id]) => state?.sourceKeys[id] === selectedSources.get(id)));
  return {
    frames,
    displayedMonth: Object.keys(frames).length || (current && !variables.length) ? state?.month : undefined,
    loading: active && !current,
    errors: current ? state?.errors ?? {} : {},
    retry: () => setAttempt(a => a + 1),
  };
}
