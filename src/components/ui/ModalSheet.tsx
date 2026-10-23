import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

interface ModalSheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}

export function ModalSheet({ open, title, children, onClose, footer }: ModalSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-sheet-root" role="presentation">
      <button type="button" className="modal-sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-sheet__header">
          <h2 className="modal-sheet__title">{title}</h2>
          <Button variant="subtle" onClick={onClose} aria-label="Close dialog">
            Close
          </Button>
        </header>
        <div className="modal-sheet__body">{children}</div>
        {footer ? <footer className="modal-sheet__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
