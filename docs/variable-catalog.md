# Variable catalog — local review, 15/11/2026

Preview: `http://127.0.0.1:5191/#catalog`. Local Vite uses the existing opt-in public API proxy (`KIPP_PREVIEW_PRODUCTION_API=1`), with no local provider credentials. No commit, push, deploy or Space Apps Project-page change was made for this work.

## Experience

The English Catalog tab offers a field guide with 12 curated profiles and the complete runtime metadata inventory. The public catalog read for this review contained 224 entries; counts and availability always come from runtime metadata. Search includes English descriptions and selected Portuguese aliases. Water, energy, atmosphere and ice filters, available-data filtering, empty/reset states and incremental rendering (24 cards at a time) keep discovery focused. Topic/ecosystem relationships are reviewed only for field-guide profiles; unprofiled inventory entries keep their producer definitions.

Amazon, Sahara, tropical Atlantic and Arctic entry points suggest questions about ordinary seasonal processes as well as change. Areas are editable study rectangles, not exact biome/basin/ocean masks. Illustrations are conceptual inline SVG generated in code, not satellite images, actual boundaries or observed conditions.

Profiles explain meaning, system role, contextual interpretation, limitations, related variables and starting questions. Source details preserve product, displayed units, overall valid-month coverage, source definitions, aggregation and quality. Source-unit encodings may differ from display units. Data kinds distinguish satellite estimates, MERRA-2 reanalysis and COSP instrument-simulator diagnostics. Native variance is not treated as trend uncertainty. No claim of forest health, event detection, causal attribution or ecosystem ideal thresholds is made.

## Investigation handoff

Choose at most six distinct variables. The builder uses the intersection of valid catalog months (positive valid samples and valid YYYY-MM labels), preserving gaps; missing IDs, unavailable fields and non-overlapping records disable the action. First/last common months bound the period; individual series still expose their coverage and gaps on load. Regional availability cannot be inferred from catalog months.

Open in Explore sends selected layers, period, selected rectangle (or current Explore area), camera and a fresh preset nonce through the existing workspace contract. Clears event context and pauses old playback. Other workspaces remain independent. Layer opacity is visual, not mathematical weighting. The builder forms an investigation; it does not calculate a new scientific variable, index or a validated formula. Use existing Explore Save/Share for the resulting configuration. Catalog state survives tab switches within the session, not a page reload.

The mobile builder collapses to a compact control, with a fixed selection/review action when variables are selected. Dialogs use the existing native modal, Escape handling and focus management; navigating to another profile resets the dialog to its top. Motion respects reduced-motion preference. No new dependencies, image downloads, frames or series are needed to browse the catalog; scientific requests start when opening Explore. The catalog module and stylesheet load on demand; inventory search uses one memoized metadata index and lists render in batches of 24, with CSS content visibility.

## Sources and AI

- NASA GMAO, MERRA-2: https://gmao.gsfc.nasa.gov/gmao-products/merra-2/
- NASA GPM, IMERG: https://gpm.nasa.gov/data/imerg
- NSIDC, Sea Ice Index v4: https://nsidc.org/data/g02135/versions/4
- NASA, African dust and Amazon phosphorus: https://www.nasa.gov/missions/calipso/nasa-satellite-reveals-how-much-saharan-dust-feeds-amazons-plants/
- NASA GPM, Sahara rainfall and Sahara/Sahel distinction: https://gpm.nasa.gov/applications/weather/news/saharaDesertAugust2024
- Nature, forest–rainfall feedback context: https://www.nature.com/articles/s41586-026-10456-0

OpenAI Codex assisted product design, English educational copy, TypeScript/CSS/SVG, tests and this record. Curated relationships are explanatory proposals supported by the references, not app-derived findings; human scientific/editorial review remains pending. Lucide icons (existing dependency, ISC) and existing project fonts/visual system reused. No external photographs or new image-generation assets.

## Verification

Node.js 24.18.0. Existing incomplete node_modules repaired from cache using offline npm install; package manifests and lockfile unchanged. The pre-change suite passed 69 tests. New helper checks cover shared valid months, deduplication, unavailable/missing IDs, malformed dates, no overlap, six-layer cap, bilingual discovery, reviewed ecosystem filtering and source-kind labels.

Browser with real public API: English and Portuguese search, zero results/reset, Sahara filtering, adding variables, related-profile navigation, technical simulator warning, unavailable field disabled, availability-only filter, preserved selection when returning from Explore. Precipitation and air temperature opened Explore with two layers, Amazon rectangle and Jan/2000–Sep/2026 (321 shared catalog months); the actual comparison charts loaded. This is integration evidence, not a completed scientific trend investigation.

Viewport 390 px: document width 390, catalog 350; dialog 352 with scroll width 350. No horizontal page overflow. Native dialog Escape and related navigation verified; related profile returns to scrollTop 0 with header visible. Mobile selection review and region controls exercised. Console check found no errors/warnings during the exercised paths. Independent scoped code review identified a stale selection removal issue after catalog refresh; removal now works even if the ID disappears. Additional final viewport/build results are recorded in the delivery checklist.

No scientific or submission blockers are marked complete. The live inventory differs from the checkout's local registry (for example generic vs hemisphere-specific sea-ice IDs); this preview deliberately uses runtime metadata and never creates missing layers from educational definitions.


## Main synchronization — 15/11/2026

At the user’s request, fetched origin/main with verified personal identity Luckstai
and fast-forwarded the existing branch from266408f to46a13b2 (164commits).
Original uncommitted work was backed up at `/tmp/kipp-main-sync-20261115-172252`
and retained in a Git stash named `local preview before main sync 2026-11-15`.
Unique local files restored; overlapping published features use their updated
main versions, including Events, Trend Lab, mascot, loading and assistant.
Only Catalog additions were reapplied to current App/LabTabs contracts.
The new SiteHeader/menu, empty Explore state, map filter panel, playback speed,
chart layout and trend/inference features from main remain present. Catalog
assistant is hidden because its context is not supported by the model contract;
the new main assistant integration with Trend Lab remains available.

Node24:149frontend tests and frontend/backend builds passed. Browser with real
API confirmed Catalog hands two variables, Amazon study rectangle and
Jan2000–Sep2026 to the current Explore. New map filters, selected-variable
configuration, playback speeds and regional/global chart controls are visible.
The main application’s existing large-chunk advisory remains. This sync is local;
no push, new commit, deployment or Project-page modification was made.

The user also proposed Antarctic, boreal, Coral Triangle, Himalayan/Tibetan,
Pantanal and Congo entry points. These are under discussion, not implemented
or certified as new measurement coverage in this preview.


## New ecosystem entries — 15/11/2026

The user requested actual inclusion of the previously proposed areas. Six new
entries bring the gallery to ten: Antarctica and Southern Ocean, boreal forest
(taiga), Coral Triangle, Himalaya and Tibetan Plateau, Pantanal, Congo Basin.
Arctic remains separate; Pantanal and Congo are separate systems. All ten are
visible without a show-more gate, using five desktop columns and two on mobile.
Inline conceptual art includes conifers, coral branches, mountains and wetland
reeds; no new assets/dependencies or observation requests while browsing.

Each entry includes a sourced system role, a question supported by existing
context variables, explicit bbox/camera and limitations. Boreal preset samples
Canada rather than claiming a full circumpolar forest mask. Antarctic uses air
temperature, winds, sensible heat, pressure and sea ice; IMERG is not suggested
for the polar preset. Coral climate context does not measure bleaching or ocean
acidity. Himalayan climate context does not measure snow/glacier mass or river
discharge. Pantanal climate context does not measure inundation or water levels.
Congo/boreal context does not measure carbon stocks, fluxes or permafrost.
Actual regional coverage remains a property of each loaded dataset.

Additional references (educational context, not newly integrated measurements):
- NASA boreal forest: https://science.nasa.gov/missions/landsat/nasa-study-finds-potential-carbon-sink-in-boreal-forest-growth/
- NOAA Coral Triangle: https://coralreef.noaa.gov/digital-corals/stories/jun20/coral-triangle/
- ICIMOD mountains/cryosphere: https://www.icimod.org/press-release/regional-cryosphere-strategy/
- UNESCO Pantanal: https://www.unesco.org/en/mab/pantanal
- UNEP Congo peatlands: https://www.unep.org/en/news-and-stories/story/critical-ecosystems-congo-basin-peatlands

Codex assisted copy, metadata, illustrations and verification. Scoped independent
review found a sea-ice question referring only to the Arctic; it now says polar.
Human scientific/editorial review remains pending. Seven added behavior checks
verify new-area filtering and avoid assigning sea ice to terrestrial/tropical
areas or inventing observations. No publication or submission change.

Verification:156frontend tests and frontend/backend builds passed on Node24. Browser with real catalog checked all six new area filters (6Antarctic,8boreal,9coral,8Himalaya,8Pantanal,8Congo profiles) and Congo two-variable handoff with321common months. Ten cards verified at1440px and390px with no horizontal overflow; no console errors in exercised paths. Review screenshot saved outside Git. Local preview retained at port5191; no publication.


## Ecosystem tags and a unified Study area — 15/11/2026

Each selected ecosystem shows process tags, every reviewed contextual variable
for that system, clickable explanations and explicit runtime availability. These
are reviewed relationships, not an exhaustive checklist or thresholds for
ecosystem health. Additional important measurements (for example soil carbon,
coral cover or glacier mass) are explicitly unlinked to a dataset in this guide;
expanding a tag explains why they matter, without inventing observations.

The View area in Explore shortcut works before selecting any variables. It
centers the map and applies the study rectangle; an empty workspace remains
empty. When variables are already selected, their selection and period remain
intact. Area commands are consumed after applying so later user choices are
not reset. The current area of an empty Explore is tracked for subsequent
Current Explore area handoff from the catalog. This issue was identified and
corrected in scoped independent review.

Explore and Compare now share Study area instead of Country, in both empty
and populated panels. The existing accessible search popover offers countries
(with flags and their bounding rectangles), all ten ecosystems, Global,
configured areas and the exact current drawn/custom rectangle. Country and
ecosystem names are distinguished in options; aliases support searches such
as Brasil and Himalaia. Changing an area does not select variables. Drawing
remains on the globe. All statistics retain their existing rectangle geometry;
no biome polygons or new dataset integration is implied.

Lightweight ecosystem metadata is shared through ecosystems.ts, while catalog
profiles remain in the lazy workspace. No new dependencies or background
scientific requests for variable tags or region discovery. Five new unit checks
verify unified options, excluded countries, global/ten ecosystem discovery,
exact current geometry and deduplication without mutating input lists.

Browser with real data verified Congo direct navigation with0variables,
Himalaia search in empty Explore, Current Explore area handoff retaining the
Himalayan rectangle, country search Brasil, and direct Congo navigation retaining
selected air temperature and Jan2000–Sep2026. UI identifies the ecosystem name
in Study area rather than Choose a country. Tags open existing field notes;
scientific/editorial review of educational relationships remains pending.
Codex assisted design, metadata, UI, tests, review and this record. Local only.

Final verification:161frontend tests and frontend/backend builds passed on Node24. Browser also confirmed manual Brazil selection survives tab switches after consuming the Congo navigation command, field notes from a variable tag, expandable unlinked Soil carbon explanation, eight contextual tags for Congo and no horizontal overflow at390/1440px. No console errors in exercised paths. Preview screenshot saved outside Git. Existing main-chunk size advisory remains; no publication.


## Countries, Places and Events — local review, 15/11/2026

The shared control is now Study context in Explore, both Compare panels and
Trend Lab, for empty and populated workspaces. It follows the Variables picker:
three internal expandable groups, Countries, Places and Events, each with an
icon, option count and current-selection count. There are no category tabs or
All group. Shared search opens matching groups and retains their labels; Brasil
finds Brazil under Countries, Congo finds countries and Congo Basin under Places,
and El Niño appears under Events. Selecting one context applies immediately.

Places include the ten reviewed ecosystems, configured study rectangles, Global
and the current drawn/custom area. Events are historical presets, not locations:
they carry a study rectangle, window, suggested variable and source/limitations.
Event metadata loads on first opening and shares the existing resource cache.
Unavailable events remain explained and disabled. Selection requires an available
suggested variable with actual catalog months overlapping the event window and
valid bounds; months are never fabricated or substituted. Regional coverage is
still checked when data loads. These monthly records do not detect the event.

Explore uses the existing editable event preset. Compare uses the existing
before/during preset in both panels, with an explicit note before selection.
Trend Lab prepares an editable area/variable/period draft and waits for Generate;
short windows may not support seasonal fitting or significance. Choosing a country
or place, drawing, or applying an assistant area command clears a stale event
context. An independent review identified the assistant-command case; corrected.

Latest main synchronized to23bc440, preserving local catalog work and main's new
Explore tour and shared Compare playback. Tour target/copy now describes the
grouped control. Node24:178frontend tests and frontend/API builds passed. Browser
with real catalog metadata verified all three surfaces, actual El Niño selection,
country reset, before/during comparison, grouped search, expandable Places and
390/1440px without horizontal overflow. Mobile accordion sections retain their
height inside the scrolling list. No console errors/warnings in exercised paths.
Existing main-chunk size advisory remains. Preview: localhost5191. No publication,
new ingestion, new scientific result or Project submission change. Codex assisted
implementation, review, verification and this documentation.


### Selector alignment refinement — local, 15/11/2026

At the user's request, removed the introductory country/place/event paragraph
from the shared picker in all workspaces. Existing event source and limitation
details remain available with the selected preset. Corrected the inherited
column direction on option buttons; the circular selection mark now sits beside
the option name with aligned vertical centers, including country flags. Browser
checked Brazil, Congo Basin and El Niño at default width and390px; center offsets
were0px and no introductory paragraph remained. Node24:178tests and frontend/API
builds passed. Screenshot outside Git; local only. Codex assisted the correction.


Hover refinement (local,15/11): removed the header wrapper's left inset and
moved spacing inside the group button. Countries/Places/Events buttons now
cover their entire headers, with hover/focus clipped by the outer rounded
border. Browser confirmed zero gaps on both sides/height and active full-width
Places hover; frontend/API builds passed. Codex assisted CSS and verification.

Search focus refinement (local,15/11): moved the focus outline from the nested
input to the shared search wrapper via focus-within, covering the magnifier and
text inside one rounded outline. Keyboard Tab/Shift+Tab verified outline removal
and restoration; no duplicate input outline. Frontend/API builds passed. Codex
assisted CSS and verification; no publication or scientific behavior changes.

Country list refinement (local,15/11): country options show the name, flag
and selection indicator, without repeated rectangle descriptions. The flag was
restored following the user clarification.
Selected trigger behavior and place/event details are unchanged. Browser
verified Brazil, search and the expanded alphabetical list;178tests and
frontend/API builds passed. Codex assisted UI and verification; local only.


## Compare and Catalog tours — local,15/11/2026

Removed the requested Sahara–Amazon footer story and unused styles. Other
field-note sources remain. Compare has a compact player that fits its controls
on desktop and wraps on mobile, preserving playback, speed, Same month, A/B
dates, loading, disabled reasons and source errors. No playback logic changed.

Manual, replayable Take the guided tour buttons use the existing GuidedTour.
Compare covers independent studies, copy, joint playback, maps and evidence.
Catalog covers ecosystems, search/scope, field notes, the six-variable builder
and Explore handoff. Tours do not choose data; Catalog opens the existing builder
for mobile guidance. Both close on workspace change and restore launcher focus.

Node24:178tests and frontend/API builds passed. Browser verified all6steps per
tour, Next/Back, arrows, Finish, Escape, replay, workspace changes and mobile
builder. Joint playback started and paused with displayed dates. Player measured
610px in1360px desktop workspace;350px at390px. Both workspaces had no horizontal
overflow. No console errors/warnings in exercised paths. Scoped review found no
important issues. Existing main-chunk size advisory remains. Codex assisted
design, TSX/CSS, copy, review and verification. Local only; no publication.


## Publication —15/11/2026

Published after main d5e2337 through PR49, main commit56bc36c. Both
https://kipp-nasa.space/ and the existing Vercel address served index-BHtSO-oE.js.
Cloudflare workflow43768999461 succeeded; Worker version
043a417f-dd65-4ed2-a41e-afa035d05099.178frontend and49backend tests, both builds
and Cloudflare dry-run passed; public browser confirmed the ten ecosystems,
both tours, grouped search, El Niño before/during presets and joint play/pause.
Real catalog:224variables, databricks-sql/trusted, simulated=false. Full release
evidence is recorded in space-apps-2026-entrega.md. Codex assisted publication;
no scientific results, submission or eligibility claims follow from this deploy.
