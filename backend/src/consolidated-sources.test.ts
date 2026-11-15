import { test } from "node:test";
import assert from "node:assert/strict";
import { variables } from "./registry.ts";
import { consolidatedTables } from "./consolidated-sources.ts";
import { trustedColumns } from "./trusted-map.ts";
import { DataService } from "./data.ts";

test("the physical registry reads only the eleven selected tables and keeps IMERG processing explicit", () => {
  assert.equal(variables.length, 224);
  assert.equal(new Set(variables.map(v => v.id)).size, variables.length);
  assert.deepEqual([...new Set(variables.map(v => v.table))].sort(), [...consolidatedTables].sort());
  const physical = variables.map(v => `${v.table}.${trustedColumns[v.table]?.[v.column]}`);
  assert.equal(new Set(physical).size, variables.length);
  assert.ok(!physical.some(v => v.endsWith(".undefined")));
  assert.ok(variables.every(v => /^[a-z0-9_]{1,40}$/.test(v.id)));
  assert.equal(variables.find(v => v.id === "temperature")?.table, "tb_merra2_temperatura");
  assert.equal(variables.find(v => v.id === "rainfall")?.run, "Final + Late");
  assert.equal(variables.find(v => v.id === "rainfall_late"), undefined);
  assert.equal(variables.find(v => v.id === "sea_ice_extent"), undefined);
  assert.ok(!variables.some(v=>v.table==="tb_sea_ice_global"));
  assert.equal(variables.find(v=>v.id==="sea_ice_concentration")?.table,"tb_sea_ice_concentration_global");
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


test("IMERG presents one chronological base per quantity and retains monthly processing", async () => {
  const selected=[variables.find(v=>v.id==="rainfall")!,variables.find(v=>v.id==="rainfall_rate")!];
  assert.equal(variables.filter(v=>v.table==="tb_gpm_imerg_precipitation_final_late").length,2);
  const service=new DataService({dialect:"databricks",async close(){},async query(sql){
    if(sql.includes("tb_indicator_coverage"))return selected.map(v=>({full_table_name:"earth-trend-data.trusted.tb_gpm_imerg_precipitation_final_late",indicator:v.column,valid_flag:true}));
    assert.match(sql,/imerg_run` IN \('Final','Late'\)/);
    assert.match(sql,/collect_set/);
    assert.ok(!sql.includes(" UNION ALL "));
    if(sql.includes("AS v0"))return [{source:0,month:"2025-09",samples:10,v0:10,v1:10,processing_run:"Final"},{source:0,month:"2025-10",samples:10,v0:10,v1:10,processing_run:"Late"}];
    return [{month:"2025-09",value:80,coverage:1,samples:10,processing_run:"Final"},{month:"2025-10",value:90,coverage:1,samples:10,processing_run:"Late"}];
  }},{variables:selected});
  const catalog=await service.catalog();
  assert.equal(catalog[0].lastMonth,"2025-10");
  assert.deepEqual(catalog[0].months.map(r=>r.processingRun),["Final","Late"]);
  const series=await service.series("rainfall","2025-09","2025-10","-180,-90,180,90");
  assert.deepEqual(series.observations.map(r=>[r.month,r.value,r.processingRun]),[["2025-09",80,"Final"],["2025-10",90,"Late"]]);
  assert.match(series.processingNote!,/not a homogenized/);
});

test("IMERG comparison transformations retain Final/Late per-month provenance", async()=>{
  const variable=variables.find(v=>v.id==="rainfall")!;
  const service=new DataService({dialect:"databricks",async close(){},async query(sql){
    assert.match(sql,/source_run/);
    return [{month:"2025-09",global_value:80,regional_value:90,global_coverage:1,regional_coverage:1,global_samples:10,regional_samples:10,processing_run:"Final"},
      {month:"2025-10",global_value:85,regional_value:95,global_coverage:1,regional_coverage:1,global_samples:10,regional_samples:10,processing_run:"Late"}];
  }},{variables:[variable]});
  const data=await service.comparison("rainfall","2025-09","2025-10","-59,-22,-54,-15");
  for(const scope of [data.global,data.regional])assert.deepEqual(scope.observations.map(r=>r.processingRun),["Final","Late"]);
  assert.equal(data.run,"Final + Late");
});
