import { useEffect, useId, useRef, useState } from "react";
import { MessageCircle, Send, Square, Trash2, X } from "lucide-react";
import type {
  AssistantContext,
  AssistantEvidence,
  AssistantResponse,
} from "../lib/assistant";
import { parseAssistantResponse, safeEvidenceUrl } from "../lib/assistant";
import { KippMascot } from "./KippMascot";
import { LoadingStatus } from "./Loading";
import "../assistant.css";

type Message = {
  role: "user" | "assistant";
  content: string;
  evidence?: AssistantEvidence[];
  status?: string;
  snapshot?: string;
};
export function Assistant({
  getContext,
  applyResponse,
  ready,
}: {
  getContext: () => AssistantContext;
  applyResponse: (
    response: AssistantResponse,
    requested: AssistantContext,
  ) => string;
  ready: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sequence = useRef(0);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, messages, pending, notice]);
  const cancel = () => {
    sequence.current++;
    controller.current?.abort();
    controller.current = null;
    setPending(false);
    setNotice("Request cancelled. No pending changes will be applied.");
  };
  const ask = async () => {
    const message = input.trim();
    if (!message || message.length > 2000 || pending || !ready) return;
    const context = getContext();
    if (!context.panels.length) {
      setNotice("Wait for the lab view to be ready.");
      return;
    }
    const request = ++sequence.current;
    const snapshot = `Request snapshot · ${new Date().toISOString()}\n${context.panels.map((panel) => `${panel.side}: ${panel.variable} · displayed ${panel.displayedMonth ?? "no frame"} · selected ${panel.selectedMonth} · series ${panel.start} to ${panel.end} · ${panel.region.name}${panel.loading ? " · loading" : ""}`).join("\n")}`;
    const abort = new AbortController();
    controller.current = abort;
    const history = messages
      .slice(-8)
      .map(({ role, content }) => ({ role, content: content.slice(0, 3000) }));
    while (
      history.length &&
      new TextEncoder().encode(JSON.stringify({ message, history, context }))
        .byteLength > 32768
    )
      history.shift();
    setMessages((previous) => [
      ...previous.slice(-39),
      { role: "user", content: message },
    ]);
    setInput("");
    setNotice("");
    setPending(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, context }),
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(90_000)]),
      });
      if (!response.ok) {
        if (response.status === 429) {
          setNotice("Assistant usage limit reached. Please try again later.");
          return;
        }
        throw new Error("Request failed");
      }
      const result = parseAssistantResponse(await response.json());
      if (request !== sequence.current || abort.signal.aborted) return;
      const status = applyResponse(result, context);
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.reply,
          evidence: result.evidence,
          status,
          snapshot,
        },
      ]);
    } catch {
      if (request === sequence.current && !abort.signal.aborted)
        setNotice("The assistant is unavailable right now. Please try again.");
    } finally {
      if (request === sequence.current) {
        setPending(false);
        controller.current = null;
      }
    }
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  return (
    <div className={`lab-assistant${open ? " is-open" : ""}`}>
      {open && (
        <section
          id={`${id}-panel`}
          className="assistant-panel"
          aria-labelledby={`${id}-title`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header className="assistant-header">
            <KippMascot animated />
            <div>
              <span className="eyebrow">KIPP · AI ASSISTANT</span>
              <h2 id={`${id}-title`}>Explore with evidence</h2>
            </div>
            <button
              type="button"
              aria-label="Clear conversation"
              title="Clear conversation"
              onClick={() => {
                cancel();
                setMessages([]);
                setNotice("Conversation cleared.");
              }}
            >
              <Trash2 size={17} />
            </button>
            <button type="button" aria-label="Close assistant" onClick={close}>
              <X size={19} />
            </button>
          </header>
          <p className="assistant-disclosure">
            AI can make mistakes. Check sources, coverage and methods. Replies
            follow your language.
          </p>
          <div
            className="assistant-history"
            role="log"
            aria-label="Assistant conversation"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {!messages.length && (
              <div className="assistant-welcome">
                <p>
                  Ask about the displayed observations, compare periods, or
                  adjust the lab.
                </p>
                <div className="assistant-suggestions">
                  {[
                    "Explain the data currently on screen",
                    "Compare the first and last available months",
                  ].map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <small>
                  Regions are rectangular study areas. Descriptive changes do
                  not establish causes or statistical significance.
                </small>
              </div>
            )}
            {messages.map((message, index) => (
              <article
                className={`assistant-message is-${message.role}`}
                key={index}
              >
                <strong>
                  {message.role === "user" ? "You" : "KIPP assistant"}
                </strong>
                <p className="assistant-message-text">{message.content}</p>
                {!!message.evidence?.length && (
                  <details className="assistant-evidence">
                    <summary>
                      Evidence & sources ({message.evidence.length})
                    </summary>
                    {message.evidence.map((item, i) => {
                      const href = safeEvidenceUrl(item.source);
                      return (
                        <div key={i}>
                          <strong>{item.title}</strong>
                          <p>{item.detail}</p>
                          {href && (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open source ↗
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </details>
                )}
                {message.status && (
                  <p className="assistant-action-status">{message.status}</p>
                )}
                {message.snapshot && (
                  <p className="assistant-snapshot">{message.snapshot}</p>
                )}
              </article>
            ))}
            {pending && (
              <LoadingStatus className="assistant-notice">
                Checking the catalog and observations… View commands are
                pending.
              </LoadingStatus>
            )}
            {notice && (
              <p className="assistant-notice" role="status">
                {notice}
              </p>
            )}
            <div ref={endRef} />
          </div>
          <form
            className="assistant-form"
            onSubmit={(event) => {
              event.preventDefault();
              void ask();
            }}
          >
            <label htmlFor={`${id}-input`}>Ask the lab</label>
            <textarea
              id={`${id}-input`}
              ref={inputRef}
              value={input}
              maxLength={2000}
              rows={2}
              placeholder="Try: show rainfall over the Amazon…"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void ask();
                }
              }}
              aria-describedby={`${id}-help`}
            />
            <div className="assistant-form-footer">
              <small id={`${id}-help`}>
                {ready
                  ? `${input.length}/2000 · Enter to send`
                  : "Choose variables in Explore or Compare to enable the assistant."}
              </small>
              {pending ? (
                <button type="button" onClick={cancel}>
                  <Square size={13} /> Cancel
                </button>
              ) : (
                <button type="submit" disabled={!ready || !input.trim()}>
                  <Send size={14} /> Send
                </button>
              )}
            </div>
          </form>
        </section>
      )}
      <button
        ref={triggerRef}
        className="assistant-trigger assistant-mascot-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <KippMascot animated />
        <span className="assistant-trigger-label">
          {open ? <X size={14} /> : <MessageCircle size={14} />}
          {open ? "Close assistant" : "Ask KIPP"}
        </span>
      </button>
    </div>
  );
}
