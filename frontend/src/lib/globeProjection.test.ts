import { describe, expect, it } from "vitest";
import { dragGlobe, globeProjection, visibleOnGlobe } from "./globeProjection";
import { initialGlobeView } from "./comparison";

describe("interactive globe orientation", () => {
  it("rotates with pointer movement and clamps latitude at the poles", () => {
    expect(dragGlobe(initialGlobeView, 100, 40)).toMatchObject({
      longitude: -93,
      latitude: 2,
    });
    expect(dragGlobe(initialGlobeView, 0, 1000).latitude).toBe(85);
    expect(dragGlobe(initialGlobeView, 0, -1000).latitude).toBe(-85);
  });
  it("projects the selected center in the center of the sphere and hides its reverse", () => {
    const view = { ...initialGlobeView, longitude: 140, latitude: 35 };
    const point = globeProjection(view)([140, 35])!;
    expect(point[0]).toBeCloseTo(320);
    expect(point[1]).toBeCloseTo(320);
    expect(visibleOnGlobe(view, [140, 35])).toBe(true);
    expect(visibleOnGlobe(view, [-40, -35])).toBe(false);
  });
});
