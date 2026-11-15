import { test } from "node:test";
import assert from "node:assert/strict";
import { variables } from "./registry.ts";
import { consolidatedTables } from "./consolidated-sources.ts";
import { trustedColumns } from "./trusted-map.ts";
import { DataService } from "./data.ts";

test("the physical registry reads only the seven consolidated tables without aliasing IMERG", () => {
  assert.equal(variables.length, 205);
  assert.equal(new Set(variables.map(v => v.id)).size, variables.length);
  assert.deepEqual([...new Set(variables.map(v => v.table))].sort(), [...consolidatedTables].sort());
  const physical = variables.map(v => `${v.table}.${trustedColumns[v.table]?.[v.column]}`);
  assert.equal(new Set(physical).size, variables.length);
  assert.ok(!physical.some(v => v.endsWith(".undefined")));
  assert.ok(variables.every(v => /^[a-z0-9_]{1,40}$/.test(v.id)));
  assert.equal(variables.find(v => v.id === "temperature")?.table, "tb_merra2_temperatura");
  assert.equal(variables.find(v => v.id === "rainfall"), undefined);
  assert.equal(variables.find(v => v.id === "merra2_flx_prectotcorr")?.unit, "kg m-2 s-1");
  const diagnostic = variables.find(v => v.id === "merra2_csp_isccpalb")!;
  assert.equal(diagnostic.dataType, "model-simulated satellite diagnostic");
  assert.match(diagnostic.description, /not a direct MODIS or ISCCP/);
});

test("different consolidated table widths preserve every indicator's valid count", async () => {
  let scans = 0;
  const selected = [variables.find(v=>v.id==="temperature")!, variables.find(v=>v.id==="merra2_t2m")!, variables.find(v=>v.id==="merra2_t250")!, variables.find(v=>v.id==="merra2_ps")!];
  const service = new DataService({ dialect: "databricks", async close() {}, async query(sql) {
    if (sql.includes("tb_indicator_coverage")) return selected.map(v => ({full_table_name:`earth-trend-data.trusted.${v.table}`,indicator:trustedColumns[v.table][v.column],valid_flag:true}));
    scans++;
    assert.ok(!sql.includes(" UNION ALL "));
    assert.match(sql, / AS v2/);
    return sql.includes("tb_merra2_temperatura")
      ? [{ source: 0, month: "2024-01", samples: 10, v0: 10, v1: 8, v2: 6 }]
      : [{ source: 1, month: "2024-01", samples: 10, v0: 4, v1: null, v2: null }];
  } }, {variables:selected});
  const catalog=await service.catalog();
  assert.equal(scans,2);
  assert.deepEqual(catalog.map(v=>v.months[0].validSamples),[10,8,6,4]);
});
