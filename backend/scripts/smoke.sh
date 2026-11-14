#!/usr/bin/env bash
set -euo pipefail
task_url="${1:?Usage: smoke.sh VERCEL_PROXY_URL}"
task_tmp="$(mktemp -d)"
trap 'rm -rf "$task_tmp"' EXIT
for task_path in v1/catalog; do
  curl --fail --silent --show-error --retry 3 --retry-all-errors --retry-delay 3 \
    --header 'Cache-Control: no-cache' --header 'Pragma: no-cache' \
    --connect-timeout 10 --max-time 60 "$task_url/$task_path" -o "$task_tmp/response.json"
  node --input-type=module - "$task_path" "$task_tmp/response.json" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const [path, file] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (path === 'ready') {
  assert.equal(data.status, 'ready');
  assert.equal(data.provider, process.env.EXPECTED_DATA_PROVIDER ?? 'lakebase-postgres');
}
if (path === 'v1/catalog') {
  assert.equal(data.simulated, false);
  assert.equal(data.provider, process.env.EXPECTED_DATA_PROVIDER ?? 'lakebase-postgres');
  assert.ok(Array.isArray(data.variables) && data.variables.length >= 4, 'Expected the real data catalog');
  for (const id of ['temperature', 'surface_temperature', 'rainfall', 'rainfall_late']) {
    assert.ok(data.variables.some(variable => variable.id === id && variable.months.length > 0), `Missing real data for ${id}`);
  }
  for (const variable of data.variables) assert.ok(variable.months.length > 0, 'Expected real table availability');
}
console.log(`Smoke OK: ${path}`);
JS
done
