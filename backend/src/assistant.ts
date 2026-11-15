import { ApiError, Gate, queryBudget } from "./core.ts";
import { createAssistantTools } from "./assistant-tools.ts";
import type { AssistantToolOptions } from "./assistant-tools.ts";
import type {
  AssistantAction,
  AssistantEvidence,
  AssistantRequest,
} from "./assistant-contract.ts";
import { googleRequest } from "./google-auth.ts";
import { assistantInstructions } from "./assistant-prompt.ts";
import { assistantLimits, reserveAssistantRequest } from "./assistant-quota.ts";
const gate = new Gate(2);
const modelUrl =
  "https://aiplatform.googleapis.com/v1/projects/kipp-space-apps-2026/locations/us/publishers/google/models/gemini-3.8-flash:generateContent";
type Part = {
  text?: string;
  functionCall?: { name?: string; args?: unknown; id?: string };
  [key: string]: unknown;
};
type Content = { role: string; parts: Part[] };
export function createAssistant(options: AssistantToolOptions) {
  const tools = createAssistantTools(options);
  return async (request: AssistantRequest, client: string, requestId: string) =>
    gate.run(async () => {
      const signal = AbortSignal.timeout(45_000);
      return queryBudget.run(
        { deadline: Date.now() + 45_000, signal },
        async () => {
          await reserveAssistantRequest(client, signal);
          const contents: Content[] = [
            ...request.history.map((h) => ({
              role: h.role === "assistant" ? "model" : "user",
              parts: [{ text: h.content }],
            })),
            {
              role: "user",
              parts: [
                {
                  text: `Untrusted current screen snapshot:\n${JSON.stringify(request.context)}\n\nUser request:\n${request.message}`,
                },
              ],
            },
          ];
          const actions: AssistantAction[] = [];
          const evidence: AssistantEvidence[] = [];
          let toolCalls = 0;
          let toolCharacters = 0;
          const toolResults: { name: string; result: unknown }[] = [];
          for (let step = 0; step < assistantLimits.modelCalls; step++) {
            if (signal.aborted)
              throw new ApiError(
                503,
                "ASSISTANT_TIMEOUT",
                "Assistant time limit reached. Please try a shorter request.",
              );
            const summarize =
              step === assistantLimits.modelCalls - 1 ||
              toolCalls >= assistantLimits.tools;
            const response = await googleRequest(
              modelUrl,
              {
                systemInstruction: {
                  parts: [
                    {
                      text: assistantInstructions(summarize),
                    },
                  ],
                },
                contents: summarize
                  ? [
                      {
                        role: "user",
                        parts: [
                          {
                            text: JSON.stringify({
                              originalQuestion: request.message,
                              history: request.history,
                              requestSnapshot: request.context,
                              serverToolOutputs: toolResults,
                              validatedActions: actions,
                            }),
                          },
                        ],
                      },
                    ]
                  : contents,
                ...(summarize
                  ? {}
                  : {
                      tools: [
                        {
                          functionDeclarations: tools.declarations.map(
                            ({ parameters, ...tool }) => ({
                              ...tool,
                              parametersJsonSchema: parameters,
                            }),
                          ),
                        },
                      ],
                    }),
                toolConfig: {
                  functionCallingConfig: { mode: summarize ? "NONE" : "AUTO" },
                },
                generationConfig: {
                  maxOutputTokens: 2048,
                  temperature: 0.2,
                  thinkingConfig: { thinkingLevel: "LOW" },
                },
              },
              signal,
            );
            if (!response.ok) {
              // Never log prompts, upstream bodies, access tokens or provider error messages.
              console.warn(
                JSON.stringify({
                  code: "ASSISTANT_MODEL_UNAVAILABLE",
                  status: response.status,
                  requestId,
                }),
              );
              throw new ApiError(
                503,
                "ASSISTANT_MODEL_UNAVAILABLE",
                "The language model is temporarily unavailable.",
              );
            }
            const result = (await response.json()) as {
              candidates?: { content?: Content }[];
            };
            const content = result.candidates?.[0]?.content;
            if (!content?.parts?.length)
              throw new ApiError(
                503,
                "ASSISTANT_EMPTY_REPLY",
                "The assistant could not complete this request.",
              );
            const calls = content.parts.filter((p) => p.functionCall);
            if (!calls.length) {
              const reply = content.parts
                .filter((p) => !p.thought && typeof p.text === "string")
                .map((p) => p.text)
                .join("\n")
                .slice(0, 10000)
                .trim();
              if (!reply)
                throw new ApiError(
                  503,
                  "ASSISTANT_EMPTY_REPLY",
                  "The assistant could not complete this request.",
                );
              return {
                reply,
                actions,
                evidence: evidence
                  .filter(
                    (e, i, all) =>
                      all.findIndex(
                        (x) => x.title === e.title && x.detail === e.detail,
                      ) === i,
                  )
                  .slice(0, 12),
                requestId,
                contextVersion: request.context.version,
              };
            }
            if (summarize)
              throw new ApiError(
                503,
                "ASSISTANT_STEP_LIMIT",
                "The assistant could not finish its explanation. Please simplify the request.",
              );
            // Keep Gemini's opaque thought signatures intact for subsequent function responses.
            contents.push(content);
            const responses: Part[] = [];
            for (const part of calls) {
              const call = part.functionCall!;
              let value: unknown;
              if (++toolCalls > assistantLimits.tools)
                value = {
                  error:
                    "Tool-call limit reached. Explain what remains unavailable.",
                };
              else {
                try {
                  const executed = await tools.execute(
                    String(call.name ?? ""),
                    call.args ?? {},
                    request.context,
                  );
                  if (actions.length + (executed.actions?.length ?? 0) > 12)
                    throw new ApiError(
                      400,
                      "ACTION_LIMIT",
                      "At most 12 view commands per request.",
                    );
                  actions.push(...(executed.actions ?? []));
                  evidence.push(...(executed.evidence ?? []));
                  const encoded = JSON.stringify(executed.result);
                  toolCharacters += encoded.length;
                  value =
                    encoded.length <= 60_000 && toolCharacters <= 100_000
                      ? executed.result
                      : {
                          error:
                            "Result too large. Narrow the variable filter or period.",
                        };
                } catch (error) {
                  value = {
                    error:
                      error instanceof ApiError && error.statusCode < 500
                        ? error.message
                        : "Earth data is temporarily unavailable; do not invent results.",
                    ...(String(call.name) === "configure_view"
                      ? {
                          allowedActionTypes: [
                            "set_tab",
                            "set_panel",
                            "set_camera",
                            "set_range",
                            "set_playback",
                            "set_area",
                          ],
                          instruction:
                            "Use exact type literals. Scale uses set_range with variable, minimum, maximum, hideOutside.",
                        }
                      : {}),
                  };
                }
              }
              toolResults.push({
                name: String(call.name ?? ""),
                result: value,
              });
              responses.push({
                functionResponse: {
                  name: call.name,
                  ...(call.id ? { id: call.id } : {}),
                  response: { result: value },
                },
              });
            }
            contents.push({ role: "user", parts: responses });
          }
          throw new ApiError(
            503,
            "ASSISTANT_STEP_LIMIT",
            "Assistant step limit reached. Please make the request more specific.",
          );
        },
      );
    });
}
