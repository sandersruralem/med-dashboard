import { useEffect, useRef, useState } from "react";
import { toDataURL } from "qrcode";

interface Props {
  link: string | null;
  onClose: () => void;
  onCopy: () => void;
}

export function ShareViewerDialog({ link, onClose, onCopy }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (link) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [link]);

  useEffect(() => {
    if (!link) {
      setQr(null);
      return;
    }
    let cancelled = false;
    void toDataURL(link, { margin: 1, width: 240, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  return (
    <dialog ref={ref} className="modal" onClose={onClose} onCancel={onClose}>
      <form method="dialog" className="modal-card" onSubmit={(e) => e.preventDefault()}>
        <h3>Viewer link</h3>
        <p className="hint">Phones and other laptops on this incident LAN can open the link or scan the code. This computer stays the editor.</p>
        {qr ? <img className="share-qr" src={qr} alt="QR code for the live viewer link" /> : null}
        {link ? (
          <p className="share-link" tabIndex={0}>
            {link}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCopy}>
            Copy link
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </form>
    </dialog>
  );
}
