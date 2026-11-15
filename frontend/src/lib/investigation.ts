import type { Investigation, InvestigationRequest } from "./earthApi";

export const investigationStorageKey = "kipp:trend-lab:investigation:v1";
export type SavedStudy = {
  version: 1;
  request: InvestigationRequest;
  regionName: string;
};
export function parseSavedStudy(value: string): SavedStudy {
  const data = JSON.parse(value) as SavedStudy;
  const r = data?.request;
  if (
    !data ||
    data.version !== 1 ||
    typeof data.regionName !== "string" ||
    data.regionName.length > 200 ||
    !r ||
    r.method !== "relationships-v1" ||
    !/^[a-z0-9_]{1,60}$/.test(r.x) ||
    (r.y !== undefined && (!/^[a-z0-9_]{1,60}$/.test(r.y) || r.x === r.y)) ||
    typeof r.bbox !== "string" ||
    r.bbox.length > 100 ||
    [r.start, r.end, r.baselineStart, r.baselineEnd].some(
      (m) => typeof m !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m),
    ) ||
    r.start > r.end ||
    r.baselineStart > r.baselineEnd
  )
    throw new Error(
      "This saved investigation is invalid or uses an unsupported version.",
    );
  return data;
}
export function downloadInvestigation(
  name: string,
  body: string,
  type: string,
) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Long-form CSV keeps heterogeneous evidence records losslessly, including the full family.
export function investigationCsv(data: Investigation) {
  const rows: unknown[][] = [
    ["record_type", "variable_or_test", "month", "payload_json"],
    [
      "study",
      "",
      "",
      JSON.stringify({
        ...data,
        series: undefined,
        lags: undefined,
        family: undefined,
      }),
    ],
  ];
  for (const s of data.series) {
    rows.push([
      "source",
      s.variable,
      "",
      JSON.stringify({
        ...s,
        observations: undefined,
        referenceObservations: undefined,
        reference: undefined,
        trend: undefined,
      }),
    ]);
    s.observations.forEach((r) =>
      rows.push(["observation", s.variable, r.month, JSON.stringify(r)]),
    );
    s.referenceObservations.forEach((r) =>
      rows.push([
        "baseline_observation",
        s.variable,
        r.month,
        JSON.stringify(r),
      ]),
    );
    s.reference.forEach((r) =>
      rows.push(["reference", s.variable, r.month, JSON.stringify(r)]),
    );
    rows.push(["trend", s.variable, "", JSON.stringify(s.trend)]);
  }
  data.lags.forEach((r) => {
    rows.push([
      "lag",
      `lag:${r.lag}`,
      "",
      JSON.stringify({ ...r, pairs: undefined }),
    ]);
    r.pairs.forEach((p) =>
      rows.push(["pair", `lag:${r.lag}`, p.xMonth, JSON.stringify(p)]),
    );
  });
  data.family.forEach((t) =>
    rows.push(["family_test", t.id, "", JSON.stringify(t)]),
  );
  return rows
    .map((row) =>
      row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
}
