import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Download,
  FolderOpen,
  Link as LinkIcon,
  Save,
  Share2,
  Upload,
} from "lucide-react";
import { Modal } from "./Modal";
import {
  INVESTIGATION_LIMITS,
  deleteInvestigation,
  exportInvestigation,
  importInvestigation,
  investigationShareHash,
  loadInvestigations,
  makeInvestigation,
  parseInvestigationHash,
  saveInvestigation,
  validateInvestigationView,
} from "../lib/investigations";
import type {
  InvestigationView,
  SavedInvestigation,
} from "../lib/investigations";
import "./investigation-controls.css";

const localNotice =
  "Saved in this browser only. No account or device sync. Clearing browser data removes saved investigations. Reopening requests current source data, not an exact data snapshot.";
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "The investigation could not be processed.";
function download(record: SavedInvestigation) {
  const url = URL.createObjectURL(
    new Blob([exportInvestigation(record)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${record.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 70) || "investigation"}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function InvestigationControls({
  getView,
  onRestore,
  ready,
  canCapture = true,
}: {
  getView: () => InvestigationView | null;
  onRestore: (view: InvestigationView, automatic?: boolean) => Promise<void>;
  ready: boolean;
  canCapture?: boolean;
}) {
  const [modal, setModal] = useState<"save" | "saved" | "share" | null>(null);
  const [records, setRecords] = useState<SavedInvestigation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<InvestigationView | null>(null);
  const [imported, setImported] = useState<SavedInvestigation | null>(null);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const initialHash = useRef(window.location.hash);
  const hashHandled = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const openedImportMetadata = useRef<{ name: string; notes: string } | null>(
    null,
  );
  const restoreRef = useRef(onRestore);
  restoreRef.current = onRestore;
  const selected = records.find((record) => record.id === selectedId);
  const reportError = (cause: unknown) => {
    setError(message(cause));
    setStatus("");
  };
  const clearMessages = () => {
    setError("");
    setStatus("");
  };
  const read = () => {
    try {
      const saved = loadInvestigations();
      setRecords(saved);
      return saved;
    } catch (cause) {
      reportError(cause);
      return null;
    }
  };
  useEffect(() => {
    if (!ready || hashHandled.current) return;
    hashHandled.current = true;
    let view: InvestigationView | null;
    try {
      view = parseInvestigationHash(initialHash.current);
    } catch (cause) {
      setError(message(cause));
      return;
    }
    if (!view) return;
    setBusy(true);
    void restoreRef
      .current(view, true)
      .then(() => {
        setStatus(
          "Shared investigation opened. Save it to keep it in this browser.",
        );
      })
      .catch((cause: unknown) => setError(message(cause)))
      .finally(() => setBusy(false));
  }, [ready]);
  const currentView = () => {
    const view = getView();
    if (!view)
      throw new Error("Wait for the current investigation to finish loading.");
    return validateInvestigationView(view);
  };
  const openSave = () => {
    clearMessages();
    try {
      setDraft(currentView());
      const saved = read();
      const active = saved?.find((record) => record.id === selectedId);
      const metadata = active ?? openedImportMetadata.current;
      setName(metadata?.name ?? "");
      setNotes(metadata?.notes ?? "");
      setModal("save");
    } catch (cause) {
      reportError(cause);
    }
  };
  const persistDraft = (replace: boolean) => {
    clearMessages();
    try {
      if (!draft) throw new Error("Select an investigation first.");
      const record = makeInvestigation(
        draft,
        name.trim() ||
          `Investigation · ${draft.panels[0].variable} · ${draft.panels[0].month}`.slice(
            0,
            120,
          ),
        notes,
      );
      const next = saveInvestigation(
        record,
        replace ? (selectedId ?? undefined) : undefined,
      );
      setRecords(next);
      openedImportMetadata.current = null;
      setSelectedId(replace ? selectedId : record.id);
      setModal(null);
      setStatus(
        replace
          ? "Investigation updated in this browser."
          : "Investigation saved in this browser.",
      );
    } catch (cause) {
      reportError(cause);
    }
  };
  const openRecord = async (record: SavedInvestigation, isImport = false) => {
    clearMessages();
    setBusy(true);
    try {
      await onRestore(validateInvestigationView(record.view));
      setSelectedId(isImport ? null : record.id);
      openedImportMetadata.current = isImport
        ? { name: record.name, notes: record.notes }
        : null;
      setModal(null);
      setStatus(
        isImport
          ? "Imported investigation opened. It is not saved yet; use Save to keep it."
          : `Opened “${record.name}” using current source data.`,
      );
    } catch (cause) {
      reportError(cause);
    } finally {
      setBusy(false);
    }
  };
  const copyRecord = (record: SavedInvestigation) => {
    clearMessages();
    try {
      const copy = makeInvestigation(
        record.view,
        `${record.name.slice(0, 113)} (copy)`,
        record.notes,
      );
      setRecords(saveInvestigation(copy));
      setStatus("Copy saved in this browser.");
      setImported(null);
    } catch (cause) {
      reportError(cause);
    }
  };
  const updateRecord = (record: SavedInvestigation) => {
    if (
      !window.confirm(
        `Replace the saved view for “${record.name}” with your current workspace? Its name and notes will stay the same.`,
      )
    )
      return;
    clearMessages();
    try {
      const updated = makeInvestigation(
        currentView(),
        record.name,
        record.notes,
      );
      setRecords(saveInvestigation(updated, record.id));
      setSelectedId(record.id);
      setStatus("Saved view updated.");
    } catch (cause) {
      reportError(cause);
    }
  };
  const removeRecord = (record: SavedInvestigation) => {
    if (
      !window.confirm(
        `Delete “${record.name}” from this browser? Export JSON first if you want to keep a copy. This cannot be undone.`,
      )
    )
      return;
    clearMessages();
    try {
      setRecords(deleteInvestigation(record.id));
      if (selectedId === record.id) setSelectedId(null);
      setStatus("Investigation deleted from this browser.");
    } catch (cause) {
      reportError(cause);
    }
  };
  const exportRecord = (record: SavedInvestigation) => {
    try {
      download(record);
      setStatus(
        "JSON exported. It contains configuration and notes, not source datasets.",
      );
      setError("");
    } catch (cause) {
      reportError(cause);
    }
  };
  const share = () => {
    clearMessages();
    try {
      const view = currentView();
      setDraft(view);
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = investigationShareHash(view);
      setLink(url.href);
      setModal("share");
    } catch (cause) {
      reportError(cause);
    }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Share link copied. Name and notes are excluded.");
      setError("");
    } catch {
      setError(
        "Clipboard access is unavailable. Select and copy the link below.",
      );
    }
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    clearMessages();
    setImported(null);
    try {
      if (file.size > INVESTIGATION_LIMITS.fileBytes)
        throw new Error(
          "Investigation file exceeds 32 KiB. Import one exported investigation JSON file.",
        );
      const record = importInvestigation(await file.text());
      setImported(record);
      setStatus("File validated. Review it before opening or saving a copy.");
    } catch (cause) {
      reportError(cause);
    }
  };
  const feedback = (
    <div
      className="investigation-feedback"
      aria-live="polite"
      aria-atomic="true"
    >
      {error && (
        <p className="investigation-error" role="alert">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
    </div>
  );
  return (
    <div className="investigation-controls">
      <div className="investigation-toolbar" aria-label="Investigation actions">
        <button
          className="button"
          disabled={!ready || !canCapture || busy}
          onClick={openSave}
          aria-label="Save investigation"
          title={
            canCapture
              ? "Save investigation"
              : "Available when an Explore or Compare view is ready"
          }
        >
          <Save size={15} aria-hidden="true" />
          <span className="investigation-action-label">Save</span>
        </button>
        <button
          className="button"
          disabled={busy}
          aria-label="Saved investigations"
          title="Saved investigations"
          onClick={() => {
            clearMessages();
            read();
            setModal("saved");
          }}
        >
          <Bookmark size={15} aria-hidden="true" />
          <span className="investigation-action-label">Saved</span>
        </button>
        <button
          className="button"
          disabled={!ready || !canCapture || busy}
          onClick={share}
          aria-label="Share investigation"
          title={
            canCapture
              ? "Share investigation"
              : "Available when an Explore or Compare view is ready"
          }
        >
          <Share2 size={15} aria-hidden="true" />
          <span className="investigation-action-label">Share</span>
        </button>
      </div>
      {!modal && feedback}
      {modal && (
        <Modal
          title={
            modal === "save"
              ? "Save investigation"
              : modal === "saved"
                ? "Saved investigations"
                : "Share this view"
          }
          onClose={() => {
            if (!busy) setModal(null);
          }}
          wide={modal === "saved"}
        >
          <div className="investigation-modal-content">
            <p className="investigation-notice">{localNotice}</p>
            {feedback}
            {modal === "save" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  persistDraft(Boolean(selected));
                }}
              >
                <label className="investigation-field">
                  Investigation name (optional)
                  <input
                    autoFocus
                    maxLength={INVESTIGATION_LIMITS.nameChars}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Leave blank for an automatic name"
                  />
                </label>
                <label className="investigation-field">
                  Notes (optional)
                  <textarea
                    rows={3}
                    maxLength={INVESTIGATION_LIMITS.notesChars}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Your question, interpretation or next step. Do not include secrets or personal information."
                  />
                </label>
                <p className="investigation-detail">
                  Saves the active workspace: area, variables, period, current
                  month, camera, visual ranges and event context. No datasets or
                  chat history.
                </p>
                <div className="investigation-actions">
                  <button className="button primary" type="submit">
                    <Save size={15} />
                    {selected
                      ? "Update saved investigation"
                      : "Save in this browser"}
                  </button>
                  {selected && (
                    <button
                      className="button"
                      type="button"
                      onClick={() => persistDraft(false)}
                    >
                      Save a new copy
                    </button>
                  )}
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      try {
                        if (draft)
                          exportRecord(
                            makeInvestigation(
                              draft,
                              name.trim() ||
                                `Investigation · ${draft.panels[0].variable} · ${draft.panels[0].month}`.slice(
                                  0,
                                  120,
                                ),
                              notes,
                            ),
                          );
                      } catch (cause) {
                        reportError(cause);
                      }
                    }}
                  >
                    <Download size={15} />
                    Export JSON
                  </button>
                </div>
              </form>
            )}
            {modal === "saved" && (
              <>
                <div className="investigation-actions">
                  <button
                    className="button"
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload size={15} />
                    Import JSON
                  </button>
                  <span className="investigation-detail">
                    Up to {INVESTIGATION_LIMITS.records} saves · 1 MiB total ·
                    32 KiB per imported file
                  </span>
                </div>
                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    void importFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                {imported && (
                  <article className="investigation-record investigation-import">
                    <h3>Review imported investigation</h3>
                    <RecordDetails record={imported} />
                    <div className="investigation-actions">
                      <button
                        className="button"
                        disabled={!ready || busy}
                        onClick={() => void openRecord(imported, true)}
                      >
                        <FolderOpen size={15} />
                        Open without saving
                      </button>
                      <button
                        className="button"
                        onClick={() => copyRecord(imported)}
                      >
                        Save a copy
                      </button>
                      <button
                        className="button"
                        onClick={() => setImported(null)}
                      >
                        Discard import
                      </button>
                    </div>
                  </article>
                )}
                {!records.length && (
                  <p>
                    No investigations saved in this browser yet. Explore freely,
                    then choose Save.
                  </p>
                )}
                <div className="investigation-records">
                  {records.map((record) => (
                    <article className="investigation-record" key={record.id}>
                      <RecordDetails record={record} />
                      <div className="investigation-actions">
                        <button
                          className="button"
                          disabled={!ready || busy}
                          onClick={() => void openRecord(record)}
                        >
                          <FolderOpen size={15} />
                          Open
                        </button>
                        <button
                          className="button"
                          disabled={!ready || !canCapture || busy}
                          onClick={() => updateRecord(record)}
                        >
                          Update from current view
                        </button>
                        <button
                          className="button"
                          onClick={() => copyRecord(record)}
                        >
                          Save copy
                        </button>
                        <button
                          className="button"
                          onClick={() => exportRecord(record)}
                        >
                          <Download size={15} />
                          JSON
                        </button>
                        <button
                          className="button investigation-delete"
                          onClick={() => removeRecord(record)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
            {modal === "share" && (
              <>
                <p>
                  The link includes view configuration only. Investigation name
                  and notes are excluded. Anyone with the link can see its
                  selected areas and dates. Reopening depends on current catalog
                  availability.
                </p>
                <label className="investigation-field">
                  Share link
                  <textarea
                    readOnly
                    rows={3}
                    value={link}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <div className="investigation-actions">
                  <button
                    className="button primary"
                    onClick={() => void copyLink()}
                  >
                    <LinkIcon size={15} />
                    Copy share link
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      try {
                        if (draft)
                          exportRecord(
                            makeInvestigation(draft, "Untitled investigation"),
                          );
                      } catch (cause) {
                        reportError(cause);
                      }
                    }}
                  >
                    <Download size={15} />
                    Export view JSON
                  </button>
                </div>
                <p className="investigation-detail">
                  Share links do not provide offline access. Keep a JSON export
                  as a portable copy of your configuration.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
function RecordDetails({ record }: { record: SavedInvestigation }) {
  return (
    <>
      <h3>{record.name}</h3>
      <p className="investigation-detail">
        {record.view.tab === "compare" ? "Compare" : "Explore"} · updated{" "}
        {new Date(record.updatedAt).toLocaleString()}
      </p>
      {record.view.panels.map((panel) => (
        <p className="investigation-detail" key={panel.side}>
          {panel.side}: {panel.variable} · {panel.region.name} · {panel.start}–
          {panel.end} · month {panel.month}
        </p>
      ))}
      {record.notes && <p className="investigation-notes">{record.notes}</p>}
    </>
  );
}
