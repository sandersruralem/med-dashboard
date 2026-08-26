import { useRef, useState } from "react";

interface Props {
  exportLabel: string;
  importLabel: string;
  confirmTitle: string;
  confirmBody: string;
  onSave: () => void;
  onExport: () => void;
  onImportText: (text: string) => string | void;
}

export function BoardIoBar({
  exportLabel,
  importLabel,
  confirmTitle,
  confirmBody,
  onSave,
  onExport,
  onImportText,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    setError(null);
    fileRef.current?.click();
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setPendingText(text);
      confirmRef.current?.showModal();
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function confirmImport() {
    if (pendingText == null) return;
    const message = onImportText(pendingText);
    confirmRef.current?.close();
    setPendingText(null);
    if (message) setError(message);
  }

  return (
    <div className="io-bar">
      <button type="button" className="btn tiny" onClick={onSave}>
        Save
      </button>
      <button type="button" className="btn tiny" onClick={onExport}>
        {exportLabel}
      </button>
      <button type="button" className="btn tiny" onClick={pickFile}>
        {importLabel}
      </button>
      <input
        ref={fileRef}
        className="hidden-file"
        type="file"
        accept="application/json,.json"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {error ? <span className="io-error">{error}</span> : null}
      <dialog
        ref={confirmRef}
        className="modal"
        onClose={() => setPendingText(null)}
      >
        <div className="modal-card">
          <h3>{confirmTitle}</h3>
          <p className="hint">{confirmBody}</p>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => confirmRef.current?.close()}>
              Cancel
            </button>
            <button type="button" className="btn primary" onClick={confirmImport}>
              Replace
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
