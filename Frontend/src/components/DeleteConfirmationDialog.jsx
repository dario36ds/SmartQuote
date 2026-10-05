import { useEffect, useId, useRef } from "react";

import Icon from "./Icon";
import "./DeleteConfirmationDialog.css";

export default function DeleteConfirmationDialog({
  open,
  title,
  children,
  warning,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const submitting = useRef(false);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function cancel() {
    if (!busy && !submitting.current) onCancel();
  }

  async function confirm(event) {
    event.preventDefault();
    if (!open || busy || submitting.current) return;
    submitting.current = true;
    try {
      await onConfirm();
    } finally {
      submitting.current = false;
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="sq-delete-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description ${id}-warning`}
      onCancel={(event) => { event.preventDefault(); cancel(); }}
    >
      <form onSubmit={confirm} aria-busy={busy}>
        <span className="sq-delete-dialog-icon"><Icon name="trash" size={26} /></span>
        <h2 id={`${id}-title`}>{title}</h2>
        <p id={`${id}-description`} className="sq-delete-dialog-description">{children}</p>
        <p id={`${id}-warning`} className="sq-delete-dialog-warning">{warning}</p>
        {error && <p className="sq-delete-dialog-error" role="alert">{error}</p>}
        <div className="sq-delete-dialog-actions">
          <button ref={cancelRef} type="button" className="sq-button sq-button-secondary" disabled={busy} onClick={cancel}>Annulla</button>
          <button type="submit" className="sq-button sq-button-danger" disabled={busy}>
            <Icon name="trash" size={18} />{busy ? "Eliminazione…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
