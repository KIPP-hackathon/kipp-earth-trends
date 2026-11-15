import { test } from "node:test";
import assert from "node:assert/strict";
import { coverageFlags, DataService, percentileDomains } from "./data.ts";
import { variables } from "./registry.ts";

test("coverage percentiles match the physical indicator and convert to display units", () => {
  const variable = variables.find((v) => v.id === "merra2_cldtmp")!;
  const row = { full_table_name: "earth-trend-data.trusted.tb_merra2_nuvens", indicator: "cloud_top_temperature_kelvin", p5: 253.15, p95: 293.15 };
  const domain = percentileDomains([row], [variable]).get(variable.id)!;
  assert.ok(Math.abs(domain[0] + 20) < 1e-9);
  assert.ok(Math.abs(domain[1] - 20) < 1e-9);
  assert.equal(percentileDomains([{ ...row, indicator: "other" }], [variable]).size, 0);
  assert.equal(percentileDomains([row, row], [variable]).size, 0);
  assert.equal(percentileDomains([{ ...row, p5: 1, p95: 1 }], [variable]).size, 0);
  assert.equal(percentileDomains([{ ...row, p5: null }], [variable]).size, 0);
});

test("catalog hides exactly matched false flags while preserving missing flags", async () => {
  const variable = variables.find((v) => v.id === "merra2_cldtmp")!;
  const row = { full_table_name: `earth-trend-data.trusted.${variable.table}`, indicator: "cloud_top_temperature_kelvin", valid_flag: "false", p5: 253.15, p95: 293.15 };
  assert.equal(coverageFlags([row], [variable]).get(variable.id), false);
  assert.equal(coverageFlags([{ ...row, indicator: "other" }], [variable]).get(variable.id), null);
  assert.equal(coverageFlags([{ ...row, valid_flag: true }, row], [variable]).get(variable.id), false);
  let sourceReads = 0;
  const service = new DataService({
    dialect: "databricks",
    async query(sql) {
      if (sql.includes("tb_indicator_coverage")) return [row];
      sourceReads++;
      return [{ source: 0, month: "2024-01", samples: 1, v0: 1 }];
    },
    async close() {},
  }, { variables: [variable] });
  const [entry] = await service.catalog();
  assert.equal(entry.available, false);
  assert.equal(entry.coverageFlag, false);
  assert.equal(entry.unavailableReason?.code, "HIDDEN_BY_COVERAGE_FLAG");
  assert.equal(sourceReads, 0, "Hidden indicators must not trigger observation scans");
});

test("catalog fails clearly when visibility configuration cannot be read", async () => {
  const variable = variables.find((v) => v.id === "merra2_cldtmp")!;
  const service = new DataService({
    dialect: "databricks",
    async query(sql) {
      if (sql.includes("tb_indicator_coverage")) throw new Error("permission denied");
      return [{ source: 0, month: "2024-01", samples: 1, v0: 1 }];
    },
    async close() {},
  }, { variables: [variable] });
  await assert.rejects(service.catalog(), { code: "COVERAGE_INVENTORY_UNAVAILABLE" });
});
