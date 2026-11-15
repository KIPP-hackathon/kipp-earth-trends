import type { AssistantContext, PanelSnapshot } from "./assistant";
import type { LabTab } from "../components/LabTabs";

/** Unsupported/no-study sections never borrow Explore observations for the AI. */
export function agentStudyContext(
  stage: LabTab,
  context: AssistantContext,
): AssistantContext {
  if (stage === "explore" || stage === "compare") return context;
  return {
    ...context,
    tab: stage === "events" ? "events" : "learn",
    panels: [],
    colorRanges: {},
  };
}
export function journeyGuidance(stage: LabTab, panel?: PanelSnapshot) {
  if (stage === "explore" && panel) {
    const months =
      (Date.parse(`${panel.end}-01`) - Date.parse(`${panel.start}-01`)) /
        (86400000 * 30.44) +
      1;
    return {
      title: "Connect the pattern to the evidence",
      detail: `${panel.region.name} · ${panel.start} – ${panel.end}. ${months < 60 ? "This is a short study: describe changes and check coverage before discussing significance." : "Compare the global and area series, then inspect the trend rate, uncertainty and adjusted p-value."} Editing map colors changes the display only.`,
      prompt:
        "Explain the current variables, region, period and limitations. Suggest a careful next step; use tools for numerical claims.",
      next: "trend" as LabTab,
      nextLabel: "Test a trend",
    };
  }
  const steps = {
    start: {
      title: "Let’s investigate our changing planet",
      detail:
        "I’m KIPP, your AI investigation guide. Start with a question, follow a historical event, then use the data to test a trend. I can explain concepts and suggest your next step.",
      prompt:
        "Help me start an Earth-system trend investigation. Explain the steps briefly and suggest a question I can explore with the available data.",
      next: "events",
      nextLabel: "Choose an event",
    },
    events: {
      title: "Turn an event into a research question",
      detail:
        "Choose a historical event and a variable with overlapping coverage. An event is a starting point, not proof of an impact or its cause.",
      prompt:
        "Help me choose a variable and a period for a historical Earth event. Check actual data coverage and explain why a coincidence does not establish a cause.",
      next: "trend",
      nextLabel: "Continue to Trend Lab",
    },
    trend: {
      title: "Measure change, then question the evidence",
      detail:
        "Choose your variables, region and period, then run the analysis. Inspect rate, uncertainty, seasonality and adjusted significance. Ask me about concepts; this chat does not receive Trend Lab results automatically.",
      prompt:
        "Explain rate of change, confidence intervals, seasonality and Holm-adjusted significance in Trend Lab. Give interpretation steps without inventing results or treating a projection as a forecast.",
      next: "explore",
      nextLabel: "Explore the data",
    },
    explore: {
      title: "Choose a place and a variable",
      detail:
        "Use the explorer to choose a variable, region and monthly period. I can explain the tools and help you frame a question.",
      prompt:
        "Suggest a careful Earth-data exploration and explain how to choose a region, variable and period based on actual coverage.",
      next: "trend",
      nextLabel: "Open Trend Lab",
    },
    compare: {
      title: "Compare like with like",
      detail:
        "These panels keep independent filters. Compare matching units and calendar periods, and check each source’s coverage before interpreting differences.",
      prompt:
        "Explain the two comparison studies and suggest a fair comparison. Check units, seasonal differences, coverage and limitations before using numerical tools.",
      next: "explore",
      nextLabel: "Back to Explore",
    },
    learn: {
      title: "Build confidence in the method",
      detail:
        "Ask about sources, rectangular regions, reanalysis, uncertainty or the difference between a trend and a forecast. General guidance does not imply that a study has been run.",
      prompt:
        "Explain how to interpret a trend from reanalysis data and what limitations I should report in an Earth-system investigation.",
      next: "events",
      nextLabel: "Start an investigation",
    },
  };
  return steps[stage] as {
    title: string;
    detail: string;
    prompt: string;
    next: LabTab;
    nextLabel: string;
  };
}
