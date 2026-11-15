import assert from "node:assert/strict";
import test from "node:test";
import { DataService } from "../data.ts";
import { validatePeriod } from "../assistant-contract.ts";
import type { Provider } from "../core.ts";

for (const dialect of ["postgres", "databricks"] as const) {
  test(`trusted temperature reads native columns and full history (${dialect})`, async () => {
    let statement = "";
    const provider: Provider = {
      dialect,
      async query(sql, parameters) {
        statement = sql;
        assert.equal(parameters?.start, "2000-01-01");
        assert.equal(parameters?.end, "2026-10-01");
        return [{ month: "2000-01", value: 24.5, coverage: 1, samples: 1 }];
      },
      async close() {},
    };
    const data = new DataService(provider, { schema: dialect === "postgres" ? "default" : "refined" });
    const result = await data.series("temperature", "2000-01", "2026-09", "170,-10,-170,10");
    assert.equal(result.observations[0].value, 24.5);
    assert.ok(statement.includes("air_temperature_at_10_meters_celsius"));
    assert.ok(statement.includes("latitude"));
    assert.ok(statement.includes("longitude"));
    assert.ok(statement.includes("+360"));
    assert.ok(!statement.includes("T10M_C"));
    assert.ok(!statement.includes("273.15"));
    assert.ok(statement.includes(dialect === "postgres"
      ? '"default"."tb_merra2_t10m_trusted"'
      : '`earth-trend-data`.`trusted`.`tb_merra2_t10m`'));
    await assert.rejects(data.series("temperature", "1990-01", "2026-09", "-60,-22,-54,-16"), /360 meses/);
  });
}

test("assistant accepts 321 months and preserves its period bound", () => {
  assert.equal(validatePeriod("2000-01", "2026-09").length, 321);
  assert.throws(() => validatePeriod("1990-01", "2026-09"), /360 months/);
});
