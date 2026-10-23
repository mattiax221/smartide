import { useEffect, useState } from "react";
import { Button, ModalSheet } from "../ui";

interface GoToLineProps {
  open: boolean;
  maxLine?: number;
  onClose: () => void;
  onGo: (line: number) => void;
}

export function GoToLine({ open, maxLine, onClose, onGo }: GoToLineProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  function submit() {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return;
    onGo(n);
    onClose();
  }

  return (
    <ModalSheet
      open={open}
      title="Go to Line"
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={submit} disabled={!value.trim()}>
          Go
        </Button>
      }
    >
      <input
        className="ui-input"
        autoFocus
        inputMode="numeric"
        placeholder={maxLine ? `1–${maxLine}` : "Line number"}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
    </ModalSheet>
  );
}
