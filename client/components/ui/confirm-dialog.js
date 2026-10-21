"use client";

import { useEffect, useRef } from "react";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", pending = false, onConfirm, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}>
    <h2 id="confirm-title">{title}</h2><p>{message}</p><div className="form-actions"><button type="button" className="button" onClick={onClose} disabled={pending}>Cancel</button><button type="button" className="button button-danger" onClick={onConfirm} disabled={pending}>{pending ? "Deleting…" : confirmLabel}</button></div>
  </dialog>;
}
