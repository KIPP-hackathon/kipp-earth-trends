# Variable catalog — local review

User approved the catalog concept and requested a local version with polished usability, visuals and performance. This preview implements that direction directly; no publication, commits or branch changes.

## Intent
Help a non-specialist move from a place or question to available Earth variables, understand their relationships, and open a reproducible investigation in Explore.

## Approach
Extend the existing React application with a Catalog tab. Reuse its real catalog resource and existing multilayer Explore preset contract. A focused field guide provides curated explanations; the complete runtime inventory remains searchable. Ecosystem entry points cover Amazon, Sahara, ocean and polar contexts, with conceptual vector artwork. Educational relationships cite primary sources and explicitly differ from computed findings. Show a profile in an accessible dialog, preserving browsing position.

Alternatives considered: a disconnected glossary would not support investigation; an unrestricted formula builder would need unit, grid and scientific validation beyond this local review. Chosen: connected educational catalog plus investigation selection. Creating a selection does not create a validated new scientific variable.

## Constraints
English primary UI; Node.js 24; no new dependencies. Curated definitions must preserve levels and distinctions between estimates, reanalyses and simulator diagnostics. Never infer availability from a profile: runtime catalog and valid common months are authoritative. Geographic presets are editable rectangles, not biome boundaries. No invented observations, thresholds, causality, predictions or significance. Preserve existing unrelated local edits. Metadata-only browsing fetches no frames or series.

## Acceptance
Search/filter/empty states, source and coverage information, related-variable navigation, keyboard dialog behavior, selection/removal/clear, explicit region and common period, and handoff to Explore. Lazy-load the catalog module and maintain its browsing state between tabs. Verify tests/builds and desktop/mobile layouts with real API; record remaining limitations in delivery evidence.

## Approved ecosystem expansion
The user requested inclusion of the proposed areas. Add Antarctic, boreal, Coral Triangle, Himalayan/Tibetan, Pantanal and Congo presets: ten areas total. Keep Arctic separate from Antarctic, and Pantanal separate from Congo. Cite primary references; context variables do not measure carbon, coral health or glacier mass. All ten cards visible, responsive grid and no extra data reads while browsing.

## Region tags and direct area navigation
User requested relevant-variable tags within an ecosystem and a direct Explore shortcut, identifying that Country misrepresents existing region support. Add selected-area process tags, all reviewed relevant context variables with notes/availability, and distinct unlinked measurement suggestions without fabricating observations. Replace Country picker in empty/selected Explore and Compare with a shared Study area picker: ecosystem rectangles, countries, global and current custom area, all searchable. Direct region shortcut must work without variables, preserve existing selections/period when present, and consume the area navigation command once so future user changes are preserved. Extract lightweight ecosystem metadata so the picker does not eagerly load educational profiles. Existing main remains authoritative; local only.

## All study selectors: countries, places/ecosystems and events
User explicitly requests all country/region filters to offer Countries, Places & ecosystems, Events. El Niño is a historical event, not a place. Reuse runtime curated event metadata and existing App event-preset behavior (Compare before/during affects both panels, disclosed); do not use legacy simulated event data. An event selection applies its associated geography, overlapping catalog period and suggested variable. Disabled/unmapped events remain visibly unavailable. Trend Lab uses the same picker and prepares a draft without automatically running analysis. Source, context and monthly limitations remain visible; country/place choices stay spatial-only. Lazy event metadata fetch on first selector open, shared read cache; preserve latest main tour/playback changes.

### Selector presentation clarified
User requires the same grouped listing pattern as Variables: exactly three internal expandable groups named Countries, Places, Events, with counts, a common search and automatic expansion for matches. No category tabs or All group. Places includes ecosystems, named study regions, Global and current custom area. Single context selection applies immediately; no multi-region analysis is implied. Update Explore tour target/instructions to the wrapper.
