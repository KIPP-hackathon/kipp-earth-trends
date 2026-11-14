import { writeFile } from "node:fs/promises";
import { feature } from "topojson-client";

// NASA Blue Marble, January 2004 (static visual basemap, never a data layer).
const textureUrl =
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/january/world.topo.bathy.200401.3x5400x2700.jpg";
const atlasUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";
for (const [url, target, convert] of [
  [
    textureUrl,
    "../public/assets/earth-texture.jpg",
    async (r) => new Uint8Array(await r.arrayBuffer()),
  ],
  [
    atlasUrl,
    "../src/lib/land.geo.json",
    async (r) => {
      const world = await r.json();
      return JSON.stringify(feature(world, world.objects.land));
    },
  ],
]) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Basemap download failed: ${response.status}`);
  await writeFile(new URL(target, import.meta.url), await convert(response));
}
