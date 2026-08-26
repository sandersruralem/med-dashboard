import { useEffect, useRef } from "react";
import { UNIT_COLUMNS, visibleCount, type ColumnVisibility, type UnitColumnId } from "../lib/columns";

interface Props {
  open: boolean;
  visibility: ColumnVisibility;
  onClose: () => void;
  onToggle: (id: UnitColumnId) => void;
}

export function ColumnPickerDialog({ open, visibility, onClose, onToggle }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog ref={ref} className="modal" onClose={onClose} onCancel={onClose}>
      <form method="dialog" className="modal-card" onSubmit={(e) => e.preventDefault()}>
        <h3>Show columns</h3>
        <p className="hint">Choose which unit columns stay on the board. At least one must remain visible.</p>
        <ul className="check-list">
          {UNIT_COLUMNS.map((col) => {
            const on = visibility[col.id];
            const lastOn = on && visibleCount(visibility) === 1;
            return (
              <li key={col.id}>
                <label>
                  <input type="checkbox" checked={on} disabled={lastOn} onChange={() => onToggle(col.id)} />
                  <span>
                    <strong>{col.label}</strong>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </form>
    </dialog>
  );
}
