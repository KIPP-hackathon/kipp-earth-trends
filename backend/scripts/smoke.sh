#!/usr/bin/env bash
set -euo pipefail
task_url="${1:?Usage: smoke.sh VERCEL_PROXY_URL}"
task_tmp="$(mktemp -d)"
trap 'rm -rf "$task_tmp"' EXIT
task_query=""
if [[ -n "${EXPECTED_REVISION:-}" ]]; then
  [[ "$EXPECTED_REVISION" =~ ^[a-z0-9-]{1,100}$ ]]
  task_query="?deployment=$EXPECTED_REVISION"
fi
curl --fail --silent --show-error --retry 3 --retry-all-errors --retry-delay 3 \
  --header 'Cache-Control: no-cache' --header 'Pragma: no-cache' \
  --connect-timeout 10 --max-time 60 "$task_url/v1/catalog$task_query" -o "$task_tmp/catalog.json"
node --input-type=module - "$task_tmp/catalog.json" "$task_tmp/month" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const [file, monthFile] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
assert.equal(data.simulated, false);
assert.equal(data.provider, 'databricks-sql');
assert.equal(data.sourceLayer, 'trusted');
if (process.env.EXPECTED_REVISION) assert.equal(data.revision, process.env.EXPECTED_REVISION);
assert.equal(data.variables.length, 224, 'All selected physical indicators must remain explicit');
const selectedTables = new Set([
  'tb_merra2_fluxos', 'tb_merra2_nuvens', 'tb_merra2_pressao_altura',
  'tb_merra2_temperatura', 'tb_merra2_umidade', 'tb_merra2_variancias',
  'tb_merra2_vento', 'tb_merra2_aerossois', 'tb_merra2_quimica',
  'tb_gpm_imerg_precipitation_final_late', 'tb_sea_ice_concentration_global'
].map(table => `earth-trend-data.trusted.${table}`));
assert.deepEqual(new Set(data.variables.map(v => v.sourceUC)), selectedTables);
assert.equal(new Set(data.variables.map(v => `${v.sourceUC}:${v.sourceColumn}`)).size, 224,
  'Physical indicators must be unique');
assert.ok(!data.variables.some(v => ['rainfall_late', 'rainfall_rate_late'].includes(v.id)),
  'IMERG Late must not duplicate the combined quantities');
for (const id of ['rainfall', 'rainfall_rate']) {
  const variable = data.variables.find(v => v.id === id);
  assert.equal(variable?.available, true);
  assert.equal(variable.sourceUC, 'earth-trend-data.trusted.tb_gpm_imerg_precipitation_final_late');
  assert.equal(variable.months.find(m => m.month === '2025-09')?.processingRun, 'Final');
  assert.equal(variable.months.find(m => m.month === '2025-10')?.processingRun, 'Late');
}
assert.equal(data.variables.find(v => v.id === 'sea_ice_concentration')?.available, true);
for (const variable of data.variables) {
  assert.equal(variable.source, 'databricks-sql');
  assert.equal(variable.sourceLayer, 'trusted');
  assert.match(variable.sourceUC, /^earth-trend-data\.trusted\./);
  assert.ok(selectedTables.has(variable.sourceUC), `Unexpected app table: ${variable.sourceUC}`);
  assert.ok(variable.sourceColumn, `Missing physical indicator: ${variable.id}`);
  if (variable.coverageFlag === false) {
    assert.equal(variable.available, false, `Flagged indicator selectable: ${variable.id}`);
    assert.equal(variable.unavailableReason?.code, 'HIDDEN_BY_COVERAGE_FLAG');
  } else {
    assert.equal(variable.coverageFlag, true, `Unconfigured indicator: ${variable.id}`);
    assert.equal(variable.available, true, `Trusted source unavailable: ${variable.id}`);
    assert.ok(variable.months.some(m => m.validSamples > 0), `No valid months: ${variable.id}`);
  }
}
assert.ok(data.variables.some(v => v.coverageFlag === false), 'Expected hidden inventory indicators');
assert.ok(data.variables.some(v => v.colorRangeSource === 'indicator_coverage_p5_p95'), 'Expected inventory percentile ranges');
const temperature = data.variables.find(v => v.id === 'temperature');
assert.equal(temperature.available, true, 'Confirmed trusted temperature must work');
assert.equal(temperature.sourceTable, 'earth-trend-data.trusted.tb_merra2_temperatura');
assert.equal(temperature.sourceUC, 'earth-trend-data.trusted.tb_merra2_temperatura');
fs.writeFileSync(monthFile, temperature.lastMonth);
console.log(`Smoke OK: trusted catalog (${data.variables.filter(v => v.available).length} available reviewed variables)`);
JS
task_month="$(cat "$task_tmp/month")"
[[ "$task_month" =~ ^[0-9]{4}-[0-9]{2}$ ]]
curl --fail --silent --show-error --connect-timeout 10 --max-time 60 \
  "$task_url/v1/frames/temperature/$task_month?factor=8&format=json${EXPECTED_REVISION:+&deployment=$EXPECTED_REVISION}" -o "$task_tmp/frame.json"
curl --fail --silent --show-error --connect-timeout 10 --max-time 60 \
  "$task_url/v1/series/temperature?start=$task_month&end=$task_month&bbox=-60,-22,-54,-16${EXPECTED_REVISION:+&deployment=$EXPECTED_REVISION}" -o "$task_tmp/series.json"
node --input-type=module - "$task_tmp/frame.json" "$task_tmp/series.json" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const [frame, series] = process.argv.slice(2).map(p => JSON.parse(fs.readFileSync(p, 'utf8')));
for (const result of [frame, series]) {
  assert.equal(result.source, 'databricks-sql');
  assert.equal(result.sourceLayer, 'trusted');
  assert.equal(result.sourceTable, 'earth-trend-data.trusted.tb_merra2_temperatura');
}
assert.ok(frame.values.some(v => Number.isFinite(v)), 'Trusted globe needs valid observations');
assert.ok(series.observations.some(p => Number.isFinite(p.value)), 'Trusted regional series needs valid observations');
console.log('Smoke OK: trusted frame and regional series');
JS

curl --fail --silent --show-error --connect-timeout 10 --max-time 60 \
  "$task_url/v1/trends?variable=surface_temperature&bbox=-80,-20,-45,5&start=2024-01&end=2026-09${EXPECTED_REVISION:+&deployment=$EXPECTED_REVISION}" -o "$task_tmp/trends.json"
node --input-type=module - "$task_tmp/trends.json" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const data=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(data.status,'exact');
assert.equal(data.referenceTable,'earth-trend-data.refined.tb_trend_merra2_ts');
assert.ok(data.results.length>0);
assert.ok(data.results.every(row=>row.n_obs===33));
console.log('Smoke OK: runtime stored trend reference (exact original 33-month period)');
JS

# Runtime comparison preserves physical values and provides both normalized chart modes.
curl --fail --silent --show-error --retry 3 --retry-all-errors --retry-delay 3 --connect-timeout 10 --max-time 60 "$task_url/v1/comparison/temperature?start=2024-01&end=2024-12&bbox=-73.98614,-33.76766,-34.73135,5.24412${EXPECTED_REVISION:+&deployment=$EXPECTED_REVISION}" -o "$task_tmp/comparison.json"
node --input-type=module - "$task_tmp/comparison.json" <<'JS_CHECK'
import fs from 'node:fs';import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(d.simulated,false);assert.equal(d.source,'databricks-sql');assert.equal(d.sourceLayer,'trusted');assert.equal(d.unit,'degC');assert.equal(d.reference.start,'2001-01');assert.equal(d.reference.end,'2020-12');
for(const scope of ['global','regional']) {
 assert.equal(d[scope].observations.length,12);
 assert.ok(d[scope].reference.every(row=>row.count>=10));
 assert.ok(d[scope].observations.every(row=>row.value!==null && Number.isFinite(row.standardized) && row.minmax>=0 && row.minmax<=100));
}
console.log('Runtime comparison smoke passed: trusted physical units, fixed monthly reference, global/regional z-scores and0–100.');
JS_CHECK

# Runtime season-adjusted slopes and robust inference need a long real record.
curl --fail --silent --show-error --retry 3 --retry-all-errors --retry-delay 3 --connect-timeout 10 --max-time 60 "$task_url/v1/comparison/temperature?start=2000-01&end=2026-09&bbox=-73.98614,-33.76766,-34.73135,5.24412&analysis=trend-v1${EXPECTED_REVISION:+&deployment=$EXPECTED_REVISION}" -o "$task_tmp/runtime-trend.json"
node --input-type=module - "$task_tmp/runtime-trend.json" <<'JS_TREND'
import fs from 'node:fs';import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(d.simulated,false);assert.equal(d.source,'databricks-sql');assert.equal(d.unit,'degC');
for(const scope of ['global','regional']) for(const mode of ['raw','standardized','minmax']) {
 const t=d[scope].trends[mode];assert.equal(t.status,'available');assert.equal(t.inferenceStatus,'available');
 assert.equal(t.method,'ols_calendar_month_hac12');assert.equal(t.hacLags,12);assert.equal(t.n,321);
 assert.equal(t.missingMonths,0);assert.equal(t.line.length,2);
 assert.ok(Number.isFinite(t.slopePerYear));assert.ok(t.standardErrorPerYear>0);assert.ok(t.pValue>=0 && t.pValue<=1);
 assert.ok(t.slopeCi95PerYear[0]<=t.slopePerYear && t.slopeCi95PerYear[1]>=t.slopePerYear);
}
console.log('Runtime trend smoke passed: real321-month series, two scopes, three representations, seasonal/HAC method and finite inference.');
JS_TREND
