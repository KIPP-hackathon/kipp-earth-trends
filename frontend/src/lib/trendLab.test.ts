import { describe, expect, it } from "vitest";
import type { EarthSeries } from "./earthApi";
import {
  fitMonthlyTrend,
  formatTrendValue,
  monthFromIndex,
  monthIndex,
  trendUnit,
} from "./trendLab";

type Observation = EarthSeries["observations"][number];
const point = (
  month: string,
  value: number | null,
  patch: Partial<Observation> = {},
): Observation => ({ month, value, coverage: 1, samples: 10, ...patch });
const reference = [1, 2, 1.3, 3.75, 2.25, 5].map((value, i) =>
  point(`2020-0${i + 1}`, value),
);

describe("calendar month coordinates", () => {
  it("uses absolute month indices across year boundaries", () => {
    expect(monthIndex("2020-01")).toBe(24240);
    expect(monthIndex("2019-12")).toBe(24239);
    expect(monthFromIndex(24251)).toBe("2020-12");
    expect(monthFromIndex(24252)).toBe("2021-01");
  });

  it.each(["2020-00", "2020-13", "2020-1", "2020-01-01", "bad", " 2020-01"])(
    "rejects invalid monthly label %s",
    (month) => expect(monthIndex(month)).toBeNull(),
  );

  it("does not create monthly labels for invalid indices", () => {
    expect(monthFromIndex(Number.NaN)).toBe("");
    expect(monthFromIndex(24240.5)).toBe("");
    expect(monthFromIndex(-1)).toBe("");
  });
});

describe("monthly OLS trend", () => {
  it("matches an independently calculated df=4 reference and mean-response confidence interval", () => {
    // For df=4: F(t)=1/2+3u/4-u^3/4, u=t/sqrt(t^2+4).
    // Solving F(t)=.975 gives 2.7764451051977987, without this module.
    const trend = fitMonthlyTrend(reference, "2020-01", "2020-06")!;
    expect(trend.slope).toBeCloseTo(0.6628571428571428, 12);
    expect(trend.interval![0]).toBeCloseTo(-0.00997427645787996, 10);
    expect(trend.interval![1]).toBeCloseTo(1.3356885621721655, 10);
    expect(trend.rSquared).toBeCloseTo(0.6516222760290556, 12);
    expect(trend.significant).toBe(false);
    expect(trend.n).toBe(6);
    expect(trend.predict(24242.5)).toBeCloseTo(2.55, 12);
    expect(trend.confidenceAt(24242.5)![0]).toBeCloseTo(1.4009215954147076, 10);
    expect(trend.confidenceAt(24242.5)![1]).toBeCloseTo(3.699078404585293, 10);
    const center = trend.confidenceAt(24242.5)!;
    const future = trend.confidenceAt(24257)!;
    expect(future[1] - future[0]).toBeGreaterThan(center[1] - center[0]);
  });

  it("uses calendar distances instead of compressing missing months", () => {
    const trend = fitMonthlyTrend(
      [point("2020-07", 16), point("2020-01", 10), point("2020-04", 13)],
      "2019-12",
      "2020-08",
    )!;
    expect(trend.slope).toBeCloseTo(1, 12);
    expect(trend.points.map(({ x }) => x)).toEqual([24240, 24243, 24246]);
    expect(trend.startMonth).toBe(24240);
    expect(trend.endMonth).toBe(24246);
    expect(trend.missingMonths).toBe(6);
    expect(trend.predict(24258)).toBeCloseTo(28, 12);
  });

  it("fits only valid values inside the inclusive submitted window", () => {
    const observations = [
      point("2019-12", 999),
      ...reference,
      point("2020-07", 999),
      point("2020-08", null),
      point("2020-09", Number.NaN),
      point("2020-10", Infinity),
      point("2020-13", 999),
      point("bad", 999),
    ];
    const trend = fitMonthlyTrend(observations, "2020-01", "2020-10")!;
    expect(trend.n).toBe(7);
    expect(trend.endMonth).toBe(24246);
    expect(trend.missingMonths).toBe(3);
    expect(
      fitMonthlyTrend(observations, "2020-01", "2020-06")!.slope,
    ).toBeCloseTo(0.6628571428571428, 12);
  });

  it("excludes absent coverage and samples but retains unknown coverage", () => {
    const trend = fitMonthlyTrend(
      [
        point("2020-01", 1, { coverage: null }),
        point("2020-02", 2),
        point("2020-03", 3),
        point("2020-04", 999, { coverage: 0 }),
        point("2020-05", 999, { coverage: -1 }),
        point("2020-06", 999, { coverage: Number.NaN }),
        point("2020-07", 999, { coverage: Infinity }),
        point("2020-08", 999, { samples: 0 }),
        point("2020-09", 999, { samples: -1 }),
        point("2020-10", 999, { samples: Number.NaN }),
      ],
      "2020-01",
      "2020-10",
    )!;
    expect(trend.n).toBe(3);
    expect(trend.slope).toBe(1);
    expect(trend.points[0].coverage).toBeNull();
    expect(trend.missingMonths).toBe(7);
  });

  it("does not inflate sample count by repeating a month", () => {
    const trend = fitMonthlyTrend(
      [...reference, point("2020-01", 999), point("2020-01", 1)],
      "2020-01",
      "2020-06",
    )!;
    expect(trend.n).toBe(6);
    expect(trend.slope).toBeCloseTo(0.6628571428571428, 12);
    expect(trend.missingMonths).toBe(0);
    expect(
      fitMonthlyTrend(
        [point("2020-01", 1), point("2020-01", 2), point("2020-02", 3)],
        "2020-01",
        "2020-06",
      ),
    ).toBeNull();
  });

  it("requires three distinct valid months and valid ordered window bounds", () => {
    expect(fitMonthlyTrend([], "2020-01", "2020-06")).toBeNull();
    expect(fitMonthlyTrend(reference, "2020-01", "2020-02")).toBeNull();
    expect(fitMonthlyTrend(reference, "2020-06", "2020-01")).toBeNull();
    expect(fitMonthlyTrend(reference, "bad", "2020-06")).toBeNull();
  });

  it("returns descriptive constant fits without directional inference or R squared", () => {
    const trend = fitMonthlyTrend(
      reference.map((p) => ({ ...p, value: 5 })),
      "2020-01",
      "2020-06",
    )!;
    expect(trend.slope).toBe(0);
    expect(trend.predict(24270)).toBe(5);
    expect(trend.rSquared).toBeNull();
    expect(trend.interval).toBeNull();
    expect(trend.significant).toBeNull();
    expect(trend.confidenceAt(24242)).toBeNull();
  });

  it("does not claim inference for a perfect fitted line", () => {
    const trend = fitMonthlyTrend(
      reference.map((p, i) => ({ ...p, value: 0.1 + 0.03 * i })),
      "2020-01",
      "2020-06",
    )!;
    expect(trend.slope).toBeCloseTo(0.03, 14);
    expect(trend.rSquared).toBe(1);
    expect(trend.interval).toBeNull();
    expect(trend.significant).toBeNull();
    expect(trend.confidenceAt(24242)).toBeNull();
  });

  it("keeps inference unavailable for a perfect line with an irregular calendar gap", () => {
    const trend = fitMonthlyTrend(
      [point("2020-01", 1), point("2020-02", 2), point("2020-04", 4)],
      "2020-01",
      "2020-04",
    )!;
    expect(trend.slope).toBeCloseTo(1, 14);
    expect(trend.rSquared).toBe(1);
    expect(trend.interval).toBeNull();
    expect(trend.significant).toBeNull();
    expect(trend.confidenceAt(24244)).toBeNull();
    expect(trend.predict(24244)).toBeCloseTo(5, 14);
    expect(trend.points.map(({ x }) => x)).toEqual([24240, 24241, 24243]);
  });

  it("detects directional noisy trends and keeps raw tiny source units", () => {
    const observations = reference.map((p, i) => ({
      ...p,
      value: (p.value! + 2 * i) * 1e-14,
    }));
    const trend = fitMonthlyTrend(observations, "2020-01", "2020-06")!;
    expect(trend.slope / 1e-14).toBeCloseTo(2.6628571428571428, 12);
    expect(trend.interval![0] / 1e-14).toBeCloseTo(1.99002572354212, 10);
    expect(trend.interval![1] / 1e-14).toBeCloseTo(3.3356885621721655, 10);
    expect(trend.significant).toBe(true);
    expect(trend.points[0].value).toBe(1e-14);
    const falling = fitMonthlyTrend(
      observations.map((p) => ({ ...p, value: -p.value! })),
      "2020-01",
      "2020-06",
    )!;
    expect(falling.interval![1]).toBeLessThan(0);
    expect(falling.significant).toBe(true);
  });

  it("uses the df=1 Student-t tail for three observations", () => {
    const trend = fitMonthlyTrend(
      [point("2020-01", 1), point("2020-02", 3), point("2020-03", 2)],
      "2020-01",
      "2020-03",
    )!;
    // SSE=1.5; Sxx=2; slope standard error=sqrt(.75).
    expect((trend.interval![1] - 0.5) / Math.sqrt(0.75)).toBeCloseTo(
      12.7062047364321,
      9,
    );
  });

  it("uses actual degrees of freedom above thirty", () => {
    const observations = Array.from({ length: 42 }, (_, i) =>
      point(
        `${2020 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
        i + (i % 2 ? 1 : -1),
      ),
    );
    const trend = fitMonthlyTrend(observations, "2020-01", "2023-06")!;
    // Direct sums: Sxx=6170.5, Sxy=6191.5, SSE=41.92853091321612.
    const se = Math.sqrt(41.92853091321612 / 40 / 6170.5);
    expect((trend.interval![1] - trend.slope) / se).toBeCloseTo(
      2.021075390306273,
      9,
    );
  });

  it("keeps fitted observations independent of later response mutations", () => {
    const observations = reference.map((p) => ({ ...p }));
    const trend = fitMonthlyTrend(observations, "2020-01", "2020-06")!;
    observations[0].value = 100;
    expect(trend.points[0].value).toBe(1);
    expect(trend.predict(24242.5)).toBeCloseTo(2.55, 12);
  });
});

describe("English source-unit presentation", () => {
  it("translates temperature and monthly precipitation units without a render factor", () => {
    expect(trendUnit("degC")).toBe("°C");
    expect(trendUnit("mm/month")).toBe("mm/month");
    expect(trendUnit("mm/mês")).toBe("mm/month");
    expect(trendUnit("kg m-2 s-1")).toBe("kg m-2 s-1");
  });

  it("formats English signed numbers while preserving small nonzero changes", () => {
    expect(formatTrendValue(1.25, true)).toBe("+1.25");
    expect(formatTrendValue(-1.25, true)).toBe("-1.25");
    expect(formatTrendValue(0, true)).toBe("0");
    expect(formatTrendValue(-0)).toBe("0");
    expect(formatTrendValue(1234.56)).toBe("1,234.6");
    expect(formatTrendValue(1e-8, true)).toBe("+1E-8");
    expect(formatTrendValue(Number.NaN)).toBe("—");
    expect(formatTrendValue(Infinity)).toBe("—");
  });
});
