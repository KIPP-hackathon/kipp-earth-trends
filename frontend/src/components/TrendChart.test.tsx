import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MonthlyTrend } from "../lib/trendLab";
import { TrendChart } from "./TrendChart";

const trend: MonthlyTrend = {
  points: [], slope: 1, interval: null, significant: null,
  n: 120, rSquared: null, startMonth: 24000, endMonth: 24120,
  missingMonths: 0, predict: month => month - 24000,
  confidenceAt: () => null,
};

const render = (from: number, to: number) => renderToStaticMarkup(
  <TrendChart trend={trend} from={from} to={to} unit="mm" />,
);

describe("Trend Lab fitted endpoints", () => {
  it("moves both endpoints and shows delta when there is room", () => {
    const near = render(24000, 24001);
    const far = render(24020, 24100);
    expect(near).not.toContain('class="trend-chart-delta"');
    expect(far).toContain('class="trend-chart-delta"');
    expect(far).toContain('Fitted change: +80 mm');
    expect(far).not.toEqual(near);
  });

  it("changes endpoint color beyond the last-observation boundary", () => {
    const historical = render(24000, 24120);
    const projected = render(24120, 24132);
    expect(historical).not.toContain('class="trend-chart-extension"');
    expect(projected).toContain('class="trend-chart-extension"');
    expect(projected).toContain('stroke="#e9bf80" stroke-width="2.7"');
    expect(projected).toContain('class="trend-chart-last-observation"');
  });
});
