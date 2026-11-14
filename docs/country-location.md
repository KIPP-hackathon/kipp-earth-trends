# Country geometry and browser location

The country outline dataset is bundled locally in
`frontend/src/lib/countries.geo.json`. Source: [world-atlas version 2.0.2,
countries-110m.json](https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json),
retrieved 14 November 2026. The [versioned source documentation](https://github.com/topojson/world-atlas/blob/v2.0.2/README.md)
identifies Natural Earth version 4.1.0, Admin 0 countries, 1:110 million scale.
The topology was converted to GeoJSON using the existing `topojson-client`
dependency and coordinates rounded to five decimal places. Source country
names and ISO 3166-1 numeric IDs are preserved. N. Cyprus, Somaliland and Kosovo
have no numeric ID in this source; `ne-*` keys identify those features and are
not official ISO assignments.

Made with Natural Earth. Its map data are [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
These generalized boundaries support a global overview. They are not legal
boundaries and do not resolve political disputes. Small countries/islands may
be absent; coastal positions can miss simplified polygons. An unmatched point
falls back to Brazil rather than guessing a country. France's geometry includes
French Guiana; Russia and Fiji cross the antimeridian. Geographic bounds retain
wrapped west/east longitudes. A country bounding rectangle is not a country mask;
an analysis using that rectangle must describe its actual spatial aggregation.
The outline alone provides no scientific observations or trend evidence.

The browser requests location on entry with low-accuracy preference, an eight
second timeout and up to one-hour browser position age. Brazil is immediately
available and remains the fallback when permission is refused, location is
unavailable or the point is outside the bundled polygons. A local point-in-polygon
test resolves the country. The hook does not retain coordinates in storage,
logs or URLs, and sends no coordinates to a reverse geocoder, API or AI service.
Only the returned country selection is available to the application. The browser
and operating system manage their own location providers and permission state.
Consumers must preserve user selections if location resolution arrives later.

OpenAI Codex assisted the conversion, country resolution helper and permission
hook. This records implementation assistance; it does not establish compliance
with the complete Space Apps AI or submission rules.
