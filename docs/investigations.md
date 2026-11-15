# Browser-local investigations

The no-login save flow keeps compact configuration, not Earth datasets or frozen
scientific results. Opening a record requests the current source catalog/data;
changes in availability are reported by the application before restoring a view.
Explore/Analysis saves one panel and Compare saves both panels. The workspace,
variable, selected area bbox and name, monthly period/current month, camera,
visual color ranges and optional curated event identifier are retained. Saving
accepts an optional name and notes; a blank name receives a readable generated title. Device location coordinates, provider
credentials and assistant conversations are not collected by this module.

Records use `localStorage` key `kipp.investigations.v1`, a versioned schema,
25-record cap and 1 MiB serialized UTF-8 budget. Storage denial, quota failures
and corrupt/unsupported data produce visible errors; existing storage is not
silently cleared. Each write rereads and validates the complete stored collection
before the browser's atomic `setItem`. Clearing site/browser data loses these
records. There is no account, synchronization or offline application guarantee.
Export JSON before clearing browser data or moving to another device.

Save names are limited to 120 characters and notes to 4,000. JSON export/import
contains one investigation and has a 32 KiB UTF-8 limit. Import validates the
whole file and presents a review before opening or explicitly saving a copy.
A share link uses a versioned UTF-8/base64url URL fragment with at most 12,000
characters. It includes only the view, excluding names and notes, and strips
query parameters. Shared selections are visible to anyone holding that URL;
fragments do not form part of ordinary HTTP requests, but are not encrypted.
No source arrays, rendered frames, statistical results or raw model responses
are included. A shared view is opened once after startup readiness and is not
automatically saved.

Validation rejects unknown fields, forbidden prototype keys, invalid types,
unsupported versions, oversized text, non-finite/range-invalid values, invalid
bbox extents (including support for dateline crossings), unordered/duplicate
panel sides and inconsistent monthly periods. Validation constructs fresh
objects rather than merging imported keys. The app separately validates actual
catalog variables, dates and event context before an atomic workspace restore;
it must not substitute unavailable selections. Save/read errors do not imply
that a scientific investigation or Space Apps submission is complete.

Implementation and this document were assisted by OpenAI Codex on 14 November
2026. Focused temporary Node.js 24 checks covered comparison/Unicode/dateline
roundtrips, configuration-only sharing, malformed and oversized input, quota
preservation, blocked storage and corrupt records. No new test suite was added,
per the team's hackathon instruction. Team review remains pending.


Integrated local browser verification on November 14, 2026: chose Japan, saved
with a blank name, reloaded, reopened from Saved, shared into a second tab and
restored the country outline/period. A comparison link restored Japan in A and
Global in B with their independent selected months. JSON export, import review
and opening without saving succeeded. At 390 px viewport width, document width
remained 390 px. Duplicate area IDs with conflicting geometry are rejected before
restore; explicit country/location changes clear incompatible event context.
A focused temporary smoke verified the conflict rejection and existing storage
preservation on quota/corrupt data. No automated suite was added.
