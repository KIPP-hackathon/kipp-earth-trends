# KIPP — animated assistant mascot

Final visual selection requested by the team on 15/11/2026:

- Keep the original Earth/Lucide + KIPP branding in the header and footer.
- Animate the robot in exactly two places: assistant header and floating button,
  including while the chat is open. Arms alternate forward/backward in depth.
- Use the robot GIF as the browser favicon, with a PNG fallback. Native favicon
  animation is browser-dependent; supplying the GIF does not prove tab animation.
- Respect reduced motion: still poster for both assistant images and PNG favicon.

## Assets and AI disclosure

Files in `frontend/public/assets/kipp/`:

| Asset | Purpose |
| --- | --- |
| `kipp-agent-v3.webp` | Transparent 304 × 296 animation, 60 frames, 2.4-second loop. |
| `kipp-logo-v3.webp` | Still poster of the same robot; reduced-motion fallback. |
| `kipp-favicon-v3.gif` | Transparent 96 × 96 favicon animation, 60 frames, 2.4 seconds. |
| `kipp-favicon-v3.png` | 128 × 128 still favicon. |

The original robot illustration and a separated torso/arm atlas were generated
using integrated OpenAI ImageGen, with prompts assisted by Codex. No film frame
or extracted film asset was used as input. Visual reference: KIPP and the
rectangular modular robots in *Interstellar* (2014). This is AI-generated
interpretive artwork, not official film art. Its Earth/graph screen is decorative,
not an observation, trend estimate or scientific simulation.

The selected movement was authored as a 3D rig with fore/aft X-axis arm rotation,
opposite phases and a three-quarter camera. Tools: Three.js 0.187.0 (MIT),
Playwright 1.65.1 (Apache-2.0), Chromium and FFmpeg. Rendered frames were encoded
as GIF, then converted to WebP for the page. The animated WebP is approximately
272 KiB, about 88% smaller than the selected original GIF. No 3D renderer or new
runtime dependency was added to the app. Code and documentation were assisted
by OpenAI Codex; the visual direction was selected and revised by the team.

## Runtime behavior

`KippMascot.tsx` supplies decorative images; the parent button/heading supplies
the accessible name. Its `<picture>` selects the animation only with
`prefers-reduced-motion: no-preference`. Existing assistant requests, context,
evidence, cancellation, input/history and focus handling are preserved.
The favicon uses `image/gif` in normal motion and a static PNG alternative.

## Release preparation

Prepared from remote `main` commit `4c0281d`,
which already includes the team's GCP migration, English interface, comparison
chart/legend updates, removal of investigation actions/location notice, and map
layer placement below playback, plus the team's later readability/font-size
updates, seasonal trend/significance charts and incremental extraction configurations.
Only mascot UI, favicon, assets, credits and project identity instructions are
applied on top. Earlier experimental logo/robot variants and unrelated local
architecture work are not part of the release. Publication uses the personal
GitHub account `Luckstai` and repository-scoped personal Git identity, as explicitly
instructed by the team. No deployment is claimed until verified.

Validation on the integrated branch: 47 frontend tests pass; frontend and API
builds pass with Node.js 24. A read-only independent review found no material
issues or reversion of team changes. CUA checked desktop and 390px mobile using
the existing public API: English interface, original logos, both assistant
animations, no horizontal overflow, visible mobile input/close controls and
preserved current team layout. This is technical UI validation, not a new
scientific result.
