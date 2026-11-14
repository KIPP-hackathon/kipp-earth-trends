# KIPP assistant v1

Implemented with AI assistance on 14 November 2026. Team review remains pending.

The floating assistant answers in the user's language and can select tabs, configure two comparison panels, choose observed months and study periods, move the shared globe camera, start/stop playback, set a shared numeric color range and select rectangular study areas. V1 areas cannot cross the antimeridian. Areas are study rectangles, not event footprints. It cannot execute arbitrary code, SQL, shell commands or external requests.

## Data and interpretation

Six server tools expose the reviewed catalog, variable metadata, curated historical events, real regional series, period comparisons and validated view commands. All use the existing DataService and provider routing. No simulated replacement is made for missing observations. A period is limited to 120 months. Spatial aggregation preserves the variable's mean/sum/category semantics; temporal means average observed monthly regional aggregates. Slopes are descriptive and require at least three valid monthly values. Categorical summaries count monthly regional modes. GRACE monthly spatial mass totals are not summed across time.

Replies retain the request timestamp, displayed and selected months, variable, study region and period. Autonomous playback may advance while a response is generated; manual changes invalidate pending commands, while playback commands use the latest live state. The assistant sees compact metadata and aggregates, not millions of grid points. The visual color range does not filter the scientific series. Text is model generated and can be wrong; inspect evidence, units, missingness and methods. No significance test, causal attribution, prediction or automatic ENSO diagnosis is implemented.

## Runtime and access

Browser `POST /api/assistant` → Vercel server function → IAM-protected Cloud Run `POST /v1/assistant` → Gemini 3.8 Flash on Vertex AI, using the runtime service account and short-lived ADC credentials. Model processing uses the US multi-region (`locations/us` on `aiplatform.googleapis.com`); Cloud Run, Lakebase and the quota database are in `us-east4`. No model key is needed. Existing Vercel workload federation is restricted to this project's production identity. The data BFF shares the same server-only authentication helper.

The chat is intentionally public on the demo site. Origin checks prevent ordinary cross-site browser requests; they are not user authentication, and a script can imitate Origin. Private Cloud Run IAM and persistent server-enforced limits provide the actual upstream protection. Vercel supplies the source IP header; the BFF hashes it and never forwards a caller-supplied quota key. No prompt/history/raw IP is stored by this implementation; request logs omit prompts and credentials. This is not a claim about provider retention policies.

Firestore transactions reserve a global 120 requests per UTC day and 12 per hashed client per UTC hour across Cloud Run instances/revisions. Failed model/data requests count too. Limits are fixed server-side; quota errors fail closed. Each request has a 45-second backend budget, at most four model calls, six tools, twelve view commands and 2,048 output tokens per model call. Input is limited to 32 KiB, message to 2,000 characters and history to eight 3,000-character messages; the browser drops old history to fit. Tool responses have character budgets. These are usage bounds, not a currency spending guarantee. At most two assistant requests execute per instance; the service is capped at three instances. Network-level abuse can still consume the public site's resources and exhaust the shared demo quota.

Runtime roles added: `roles/aiplatform.user` and `roles/datastore.user` restricted by an IAM condition to the default Firestore database. Database counters are private; anonymous document access returned 403. The temporary database setup role was removed after provisioning. No browser database SDK or persistent model credentials were introduced.

## Verification

Node.js 24 frontend/backend builds; independent source security review; real read-only Lakebase/tool smoke; live Gemini invocation; local browser comparison of Pantanal January–March versus April–June 2024; persistent quota smoke (12 accepted, next denied); anonymous Firestore rejection. Publication and private direct Cloud Run verification are recorded separately after deployment. No new automated suites were introduced at the user's hackathon request; the existing CI checks remain enabled.
