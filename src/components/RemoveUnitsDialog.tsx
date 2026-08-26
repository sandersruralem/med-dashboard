import { useEffect, useRef, useState } from "react";
import type { MedicalResource } from "../types";

interface Props {
  open: boolean;
  resources: MedicalResource[];
  onClose: () => void;
  onConfirmDelete: (ids: string[]) => void;
}

export function RemoveUnitsDialog({ open, resources, onClose, onConfirmDelete }: Props) {
  const pickerRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (open) {
      setSelected(new Set());
      if (!picker.open) picker.showModal();
    } else if (picker.open) {
      picker.close();
      confirmRef.current?.close();
    }
  }, [open]);

  const chosen = resources.filter((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openConfirm() {
    if (chosen.length === 0) return;
    confirmRef.current?.showModal();
  }

  return (
    <>
      <dialog
        ref={pickerRef}
        className="modal"
        onClose={onClose}
        onCancel={onClose}
      >
        <form
          method="dialog"
          className="modal-card"
          onSubmit={(e) => {
            e.preventDefault();
            openConfirm();
          }}
        >
          <h3>Remove units</h3>
          <p className="hint">Select the units to delete from this incident.</p>
          {resources.length === 0 ? (
            <p className="hint">No units on the board.</p>
          ) : (
            <ul className="check-list">
              {resources.map((r) => (
                <li key={r.id}>
                  <label>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                    <span>
                      <strong>{r.fireName || "Untitled"}</strong>
                      <em>{r.vendor || "No vendor"}</em>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn danger" disabled={chosen.length === 0}>
              Delete
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={confirmRef} className="modal">
        <div className="modal-card">
          <h3>Confirm delete</h3>
          <p className="hint">
            Delete {chosen.length} unit{chosen.length === 1 ? "" : "s"}? This cannot be undone.
          </p>
          <ul className="confirm-names">
            {chosen.map((r) => (
              <li key={r.id}>{r.fireName || "Untitled"}</li>
            ))}
          </ul>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => confirmRef.current?.close()}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                confirmRef.current?.close();
                onConfirmDelete(chosen.map((r) => r.id));
                onClose();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
