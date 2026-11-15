import { describe, expect, it } from "vitest";
import { colorRangeDraft } from "./colorRangeDraft";
describe("inline legend edits", () => {
  it("commits finite decimal/scientific limits and preserves masking", () => {
    expect(colorRangeDraft("-5.5", "2e1", false)).toEqual({
      domain: [-5.5, 20],
      hideOutside: false,
    });
    expect(colorRangeDraft("0", "1", true)).toEqual({
      domain: [0, 1],
      hideOutside: true,
    });
  });
  it("rejects blank, reversed, equal and nonfinite edits instead of changing display", () => {
    for (const [low, high] of [
      ["", "5"],
      [" ", "5"],
      ["10", "5"],
      ["5", "5"],
      ["NaN", "5"],
      ["0", "Infinity"],
    ])
      expect(colorRangeDraft(low, high, false)).toBeUndefined();
  });
});
