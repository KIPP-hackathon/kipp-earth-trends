import { describe, expect, it } from "vitest";
import { trailingMean, yearTicks } from "./seriesChart";

describe("trailingMean", () => {
  it("averages complete windows and never bridges gaps", () => {
    const rows = ["2000-01", "2000-02", "2000-03", "2000-04", "2000-05"].map(
      (month, i) => ({ month, value: i === 3 ? null : i + 1 }),
    );
    expect(trailingMean(rows, 2).map((r) => r.value)).toEqual([
      null,
      1.5,
      2.5,
      null,
      null,
    ]);
  });
  it("treats months missing from the input as gaps", () => {
    const rows = [
      { month: "2000-01", value: 1 },
      { month: "2000-03", value: 3 },
    ];
    expect(trailingMean(rows, 2).map((r) => r.value)).toEqual([null, null]);
  });
});

describe("yearTicks", () => {
  it("labels every January in short records", () => {
    expect(yearTicks("2000-06", "2003-02")).toEqual([
      "2001-01",
      "2002-01",
      "2003-01",
    ]);
  });
  it("thins long records to round years", () => {
    expect(yearTicks("2000-01", "2026-09", 8)).toEqual([
      "2000-01",
      "2005-01",
      "2010-01",
      "2015-01",
      "2020-01",
      "2025-01",
    ]);
  });
});
