# KIPP assistant v1 implementation plan

**Goal:** Publish a floating assistant that explains real observations, queries bounded analysis tools, and operates the existing lab through validated actions. User approved Gemini/GCP approach and production deployment; no provider secrets in the browser.

**Architecture:** Existing React + authenticated Vercel BFF + private Fastify/Cloud Run. Gemini native GCP REST with workload identity (no static API key). Backend tools query DataService, calculate descriptive statistics and return source/quality/evidence. The browser applies whitelisted commands and reports actual displayed state. No arbitrary SQL, URLs, code execution or unsupported scientific inference.

**Contract:** POST /api/assistant -> private POST /v1/assistant. Request `{message,history:[{role:'user'|'assistant',content}],context:{version,tab,panels:[{side,variable,selectedMonth,displayedMonth,start,end,region:{id,name,bbox,longitude,latitude},loading,playing}],camera:{longitude,latitude,zoom,showLayer},colorRanges}}`. Response `{reply,actions,evidence,requestId,contextVersion}`. Evidence items `{title,detail,source?:string}` contain no secrets. Message<=2000 chars, <=8 history entries; context data is advisory and server-revalidated.

**Actions:** `{type:'set_tab',tab}`, `{type:'set_panel',side,variable,month,start?,end?,regionId?}`, `{type:'set_camera',longitude,latitude,zoom?}`, `{type:'set_range',variable,minimum,maximum,hideOutside}`, `{type:'set_playback',side,playing}`, `{type:'set_area',bbox,name}`. All schemas reject extra fields; coordinates/domain/variable/month/region bounds are checked. set_area selects a rectangular custom study region on A (and B if comparison), without claiming event footprint/polygon support.

**Tools:** list_variables; describe_variable; list_events; analyze_series(variable,bbox,start,end); compare_periods(variable,bbox,startA,endA,startB,endB); configure_view(actions). Scientific tools return observed values, missing months, coverage, summary, and descriptive slope only when meaningful; no p-values/causal conclusions. Categorical data use category counts, no numeric means. API and selected displayed month/scale remain distinct from unfiltered regional series.

- [x] Frontend floating chat, snapshots, periods/custom bbox and validated command application; same-variable shared scale preserved.
- [x] Backend typed tools, input/action validation and provenance from actual catalog/data.
- [x] Gemini ADC integration; fixed model endpoint; bounded loop/tokens/deadline; generic errors and redacted logs.
- [x] Authenticated BFF POST, server-derived client quota key, persistent global/per-client quotas, fail closed on quota failure.
- [ ] Build Node24, real tools/model/browser smoke, independent security review, secret scan, publish and verify protected direct Cloud Run access.
- [x] Update Space Apps evidence/AI register without claiming overall challenge completion.
