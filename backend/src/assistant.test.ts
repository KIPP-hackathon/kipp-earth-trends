import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { createAssistant } from "./assistant.ts";
import { createAssistantTools } from "./assistant-tools.ts";
import { DataService, metadataOf, variableFor } from "./data.ts";
import type { AssistantRequest } from "./assistant-contract.ts";
import type { CatalogVariable } from "./data.ts";

afterEach(() => mock.restoreAll());

// Synthetic fixtures exercise transport/provenance, not scientific findings.
const catalog: CatalogVariable[] = [
  {
    ...metadataOf(variableFor("rainfall")),
    months: ["2025-09", "2025-10", "2025-11"].map((month) => ({
      month,
      samples: 10,
      validSamples: 10,
    })),
    available: true,
    firstMonth: "2025-09",
    lastMonth: "2025-11",
    unavailableReason: null,
    colorRangeSource: "configured_default",
    coverageFlag: true,
  },
];
const request: AssistantRequest = {
  message: "Compare the periods and explain any missing evidence.",
  history: [{ role: "assistant", content: "Unverified earlier answer." }],
  context: {
    version: 7,
    tab: "explore",
    panels: [],
    camera: { longitude: 0, latitude: 0, zoom: 1, showLayer: true },
    colorRanges: {},
  },
};
const data = new DataService({
  dialect: "databricks",
  async close() {},
  async query() {
    return [
      {
        month: "2025-09",
        value: 80,
        coverage: 1,
        samples: 10,
        processing_run: "Final",
      },
      {
        month: "2025-11",
        value: 90,
        coverage: 1,
        samples: 10,
        processing_run: "Late",
      },
    ];
  },
});
const options = { data, catalog: async () => catalog };

test("assistant definition and series preserve processing changes and regional gaps", async () => {
  const tools = createAssistantTools(options);
  const definition = await tools.execute(
    "describe_variable",
    { id: "rainfall" },
    request.context,
  );
  assert.match(
    (definition.result as { processingNote: string }).processingNote,
    /not a homogenized/,
  );
  const analyzed = await tools.execute(
    "analyze_series",
    {
      variable: "rainfall",
      bbox: "-60,-22,-54,-16",
      start: "2025-09",
      end: "2025-11",
    },
    request.context,
  );
  const result = analyzed.result as {
    processingNote: string;
    observations: {
      month: string;
      value: number | null;
      processingRun?: string;
    }[];
    coverage: {
      validMonths: number;
      expectedMonths: number;
      missingMonths: string[];
    };
  };
  assert.match(result.processingNote, /not a homogenized/);
  assert.deepEqual(
    result.observations.map((row) => [row.month, row.value, row.processingRun]),
    [
      ["2025-09", 80, "Final"],
      ["2025-10", null, undefined],
      ["2025-11", 90, "Late"],
    ],
  );
  assert.equal(result.coverage.validMonths, 2);
  assert.equal(result.coverage.expectedMonths, 3);
  assert.deepEqual(result.coverage.missingMonths, ["2025-10"]);
});

type ModelBody = {
  systemInstruction: { parts: { text: string }[] };
  contents: { parts: { text: string }[] }[];
  tools?: unknown;
  toolConfig: { functionCallingConfig: { mode: string } };
};
type Call = { name: string; args: unknown };

async function runToSynthesis(batches: Call[][]) {
  const modelBodies: ModelBody[] = [];
  mock.method(
    globalThis,
    "fetch",
    async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname === "metadata.google.internal")
        return Response.json({
          access_token: "fixture-token",
          expires_in: 3600,
        });
      const body = JSON.parse(String(init?.body));
      if (url.hostname === "firestore.googleapis.com") {
        if (url.pathname.endsWith(":beginTransaction"))
          return Response.json({ transaction: "fixture-transaction" });
        if (url.pathname.endsWith(":batchGet"))
          return Response.json(
            body.documents.map((name: string) => ({ missing: name })),
          );
        assert.ok(url.pathname.endsWith(":commit"));
        return Response.json({ committed: true });
      }
      assert.equal(url.hostname, "aiplatform.googleapis.com");
      modelBodies.push(body);
      const batch = batches[modelBodies.length - 1];
      return Response.json({
        candidates: [
          {
            content: {
              role: "model",
              parts: batch
                ? batch.map((functionCall) => ({ functionCall }))
                : [{ text: "Fixture synthesis; not a live model evaluation." }],
            },
          },
        ],
      });
    },
  );
  const result = await createAssistant(options)(
    request,
    "a".repeat(64),
    "fixture-request",
  );
  return { result, modelBodies };
}

const reference: Call = {
  name: "search_indicators",
  args: { query: "rainfall" },
};
for (const [reason, batches] of [
  [
    "tool budget",
    [
      [
        {
          name: "configure_view",
          args: { actions: [{ type: "set_tab", tab: "compare" }] },
        },
        reference,
      ],
      [
        {
          name: "configure_view",
          args: { actions: [{ type: "set_color_range" }] },
        },
        reference,
        reference,
        reference,
      ],
    ],
  ],
  ["model budget", [[reference], [reference], [reference]]],
] as [string, Call[][]][]) {
  test(`final synthesis retains evidence policy and disables tools at the ${reason}`, async () => {
    const { result, modelBodies } = await runToSynthesis(batches);
    assert.equal(modelBodies.length, batches.length + 1);
    const first = modelBodies[0],
      last = modelBodies.at(-1)!;
    assert.equal(first.toolConfig.functionCallingConfig.mode, "AUTO");
    assert.ok(first.tools);
    assert.equal(last.toolConfig.functionCallingConfig.mode, "NONE");
    assert.equal(last.tools, undefined);
    // Guard the regression: the former final-call prompt lost the planning
    // policy about runtime inference, processing, screen state and actions.
    const finalPolicy = last.systemInstruction.parts[0].text.split(
      "\n\nFINAL SYNTHESIS\n",
    )[0];
    assert.ok(finalPolicy.includes("SCIENTIFIC INTERPRETATION"));
    assert.ok(finalPolicy.includes("WHAT THE SCREEN MEANS"));
    assert.ok(finalPolicy.includes("ACTION AND ANSWER CONTRACT"));
    assert.ok(first.systemInstruction.parts[0].text.startsWith(finalPolicy));
    const input = JSON.parse(last.contents[0].parts[0].text);
    assert.equal(input.originalQuestion, request.message);
    assert.deepEqual(input.requestSnapshot, request.context);
    assert.deepEqual(input.history, request.history);
    assert.equal(input.serverToolOutputs.length, batches.flat().length);
    assert.ok(
      input.serverToolOutputs.some(
        (output: { result: { status?: string } }) =>
          output.result.status === "unavailable",
      ),
    );
    assert.equal(result.contextVersion, 7);
    if (reason === "tool budget") {
      assert.deepEqual(result.actions, [{ type: "set_tab", tab: "compare" }]);
      assert.deepEqual(input.validatedActions, result.actions);
      assert.ok(
        input.serverToolOutputs.some(
          (output: { result: { error?: string } }) => output.result.error,
        ),
      );
    } else assert.deepEqual(result.actions, []);
  });
}
