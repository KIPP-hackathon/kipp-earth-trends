# Trend Lab assistant integration

Implemented with OpenAI Codex assistance on 15 November 2026.

The assistant can now open Trend Lab, choose one or two continuous variables,
an exact study rectangle and dates, run the existing investigation and explain
its server-computed results. The reference period equals the selected study
period, matching the current page. Limits remain 600 months per investigation,
six tools/four model calls, 45 seconds and twelve view actions per chat request.

`run_investigation` uses the existing DataService investigation engine. The model
receives compact source metadata, coverage, processing runs, seasonal trends,
all seven lag summaries, the complete Holm family and scientific limitations.
Raw observations and pair arrays are excluded from the model payload. No new
statistical estimator or inference threshold is introduced.

Trend Lab sends its draft selection and last submitted selection separately,
with loading state and result timestamp when available. It sends no purported
p-values as authoritative evidence. For explanations the assistant recomputes
the applied selection. The browser applies only a standalone validated run action
and requests the same investigation through its existing endpoint/cache. The
explanation refers to the server computation timestamp; subsequent data refresh
can change values. This is not a frozen result transfer.

Manual variable/area/date edits and manual runs invalidate pending assistant
actions through the existing context version. Changing tabs also invalidates
pending actions. The browser revalidates catalog availability, continuous data,
distinct variables, bounds, endpoint coverage and period length. Mixed Trend Lab
and globe action batches are rejected. Existing endpoint failures/retry and
loading states remain in use; no fabricated fallback observations are introduced.

Automated checks cover the backend-to-browser selection contract, wrapped bounds,
draft/applied distinction, invalid/mixed actions and tool preservation of trend,
Holm, missingness and processing information. Live model and UI verification is
recorded in the delivery checklist. Human scientific review remains separate.
