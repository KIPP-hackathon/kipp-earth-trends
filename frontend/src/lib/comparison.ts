import type { RegionId, Variable } from "./analysis";
import { initialPlayback, playbackReducer } from "./playback";
import type { MapMode, PlaybackAction, PlaybackState } from "./playback";

export type Side = 0 | 1;
export type GlobeView = {
  zoom: number;
  showLayer: boolean;
  longitude: number;
  latitude: number;
};
export const initialGlobeView: GlobeView = {
  zoom: 1,
  showLayer: true,
  longitude: -58,
  latitude: -12,
};
export type Scenario = {
  region: RegionId;
  variable: Variable;
  mode: MapMode;
  timeline: PlaybackState;
  view: GlobeView;
  context?: string;
};
export type TimeMode = "independent" | "date" | "relative";
export type ComparisonState = {
  scenarios: [Scenario, Scenario];
  timeMode: TimeMode;
  linkedView: boolean;
};
export type ComparisonAction =
  | {
      type: "filter";
      side: Side;
      patch: Partial<Pick<Scenario, "region" | "variable" | "mode">>;
    }
  | { type: "playback"; side: Side; action: PlaybackAction }
  | { type: "view"; side: Side; view: GlobeView }
  | { type: "link-view"; linked: boolean; side: Side }
  | { type: "sync"; mode: TimeMode }
  | { type: "duplicate"; side: Side }
  | { type: "load"; scenarios: [Scenario, Scenario] }
  | { type: "pause" };

export function createScenario(
  patch: Omit<Partial<Scenario>, "timeline" | "view"> & {
    timeline?: Partial<PlaybackState>;
    view?: Partial<GlobeView>;
  } = {},
): Scenario {
  return {
    region: "saofrancisco",
    variable: "temperature",
    mode: "anomaly",
    ...patch,
    timeline: { ...initialPlayback, ...patch.timeline },
    view: { ...initialGlobeView, ...patch.view },
  };
}
export function createComparison(
  a = createScenario(),
  b = createScenario({ region: "amazonia" }),
): ComparisonState {
  return {
    scenarios: [createScenario(a), createScenario(b)],
    timeMode: "independent",
    linkedView: false,
  };
}
export function hasDateOverlap(state: ComparisonState) {
  const [a, b] = state.scenarios.map((s) => s.timeline);
  return Math.max(a.start, b.start) <= Math.min(a.end, b.end);
}
export function comparisonTimeline(
  state: ComparisonState,
  side: Side,
): PlaybackState {
  const own = state.scenarios[side].timeline;
  const [a, b] = state.scenarios.map((s) => s.timeline);
  if (state.timeMode === "date")
    return {
      ...own,
      start: Math.max(a.start, b.start),
      end: Math.min(a.end, b.end),
    };
  if (state.timeMode === "relative")
    return {
      ...own,
      end: own.start + Math.min(a.end - a.start, b.end - b.start),
    };
  return own;
}
function align(state: ComparisonState, source: Side): ComparisonState {
  if (state.timeMode === "independent") return state;
  if (state.timeMode === "date" && !hasDateOverlap(state))
    return {
      ...state,
      timeMode: "independent",
      scenarios: state.scenarios.map((s) => ({
        ...s,
        timeline: { ...s.timeline, playing: false },
      })) as [Scenario, Scenario],
    };
  const effective = comparisonTimeline(state, source);
  const frame = Math.max(
    effective.start,
    Math.min(effective.end, effective.frame),
  );
  const offset = frame - effective.start;
  return {
    ...state,
    scenarios: state.scenarios.map((s) => ({
      ...s,
      timeline: {
        ...s.timeline,
        frame: state.timeMode === "date" ? frame : s.timeline.start + offset,
        playing: effective.playing && effective.start < effective.end,
        speed: effective.speed,
        loop: effective.loop,
      },
    })) as [Scenario, Scenario],
  };
}
export function comparisonReducer(
  state: ComparisonState,
  action: ComparisonAction,
): ComparisonState {
  if (action.type === "load") return createComparison(...action.scenarios);
  if (action.type === "pause")
    return {
      ...state,
      scenarios: state.scenarios.map((s) => ({
        ...s,
        timeline: { ...s.timeline, playing: false },
      })) as [Scenario, Scenario],
    };
  if (action.type === "sync")
    return align(
      { ...comparisonReducer(state, { type: "pause" }), timeMode: action.mode },
      0,
    );
  if (action.type === "link-view")
    return {
      ...state,
      linkedView: action.linked,
      scenarios: action.linked
        ? (state.scenarios.map((s) => ({
            ...s,
            view: { ...state.scenarios[action.side].view },
          })) as [Scenario, Scenario])
        : state.scenarios,
    };
  const scenarios = [...state.scenarios] as [Scenario, Scenario];
  const own = scenarios[action.side];
  if (action.type === "filter")
    scenarios[action.side] = {
      ...own,
      ...action.patch,
      context: action.patch.region ? undefined : own.context,
    };
  if (action.type === "view") {
    scenarios[action.side] = { ...own, view: action.view };
    if (state.linkedView)
      scenarios[action.side === 0 ? 1 : 0] = {
        ...scenarios[action.side === 0 ? 1 : 0],
        view: { ...action.view },
      };
  }
  if (action.type === "duplicate") {
    scenarios[action.side === 0 ? 1 : 0] = createScenario({
      ...own,
      timeline: { ...own.timeline, playing: false },
    });
    scenarios[action.side] = {
      ...own,
      timeline: { ...own.timeline, playing: false },
    };
  }
  if (action.type === "playback") {
    const rangeChange =
      action.action.type === "range" || action.action.type === "preset";
    const next = playbackReducer(
      rangeChange ? own.timeline : comparisonTimeline(state, action.side),
      action.action,
    );
    scenarios[action.side] = {
      ...own,
      context: rangeChange ? undefined : own.context,
      timeline: rangeChange
        ? next
        : {
            ...own.timeline,
            frame: next.frame,
            playing: next.playing,
            speed: next.speed,
            loop: next.loop,
          },
    };
  }
  return align({ ...state, scenarios }, action.side);
}
