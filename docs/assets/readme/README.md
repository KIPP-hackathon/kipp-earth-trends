# README visual assets

## Product screenshots

`explore.png`, `compare.png` and `trend-lab.png` are unmodified copies of local application QA captures from 15 November 2026. They show the real React interface using public Earth-data API responses. Explore was captured directly in the local application; Compare and Trend Lab come from the prepared local demonstration. They are not reconstructed mockups, synthetic datasets or proof that every local change is deployed. The full-resolution source paths and SHA-256 hashes are in `screenshots.json`.

Explore shows MERRA-2 eastward wind at 10 m for January 2024, with paired U + V wind trails over the full globe and original-unit series for a Brazil bounding region and the globe over January 2000–September 2026. Trail motion represents direction, not speed. The selected component and charts use m/s; the screenshot does not establish a significant regional wind trend. Compare shows January and July 2024 on the same temperature scale; this illustrates spatial/seasonal comparison, not a test of causal impact. Trend Lab shows a temperature result within a two-indicator investigation; its Holm-adjusted p refers to that investigation family, while the README case table explicitly reports the unadjusted p from the independent API check.

The Earth background uses NASA Blue Marble and geography uses Natural Earth/world-atlas. The visible assistant mascot is AI-generated artwork by OpenAI ImageGen, as credited in [the mascot record](../../kipp-mascot.md). Screenshots are application captures, not AI-generated science imagery. The prepared demonstration and documentation were assisted by OpenAI Codex. No new image generation was used for this README.

## Technology logos

The 18 technology marks in `stack/` come from **Simple Icons 16.38.0**, retrieved from its npm package. Original vector paths are preserved and placed on neutral light tiles, using the package's listed colors for legibility in light/dark README themes. No raster logo was synthesized.

See `stack/sources.json` for individual source URLs, guidelines and license metadata, and the bundled Simple Icons license/disclaimer. The collection is distributed under CC0, but individual marks retain their respective trademark and license conditions. Logos identify technologies used by KIPP; they do not imply partnership, sponsorship or endorsement.
