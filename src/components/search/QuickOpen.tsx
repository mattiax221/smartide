import { useEffect, useMemo, useState } from "react";
import { fuzzyScore, type FsEntry } from "../../lib/workspace";
import { ModalSheet } from "../ui";

interface QuickOpenProps {
  open: boolean;
  entries: FsEntry[];
  onClose: () => void;
  onPick: (entry: FsEntry) => void;
}

export function QuickOpen({ open, entries, onClose, onPick }: QuickOpenProps) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const files = useMemo(() => entries.filter((e) => e.kind === "file"), [entries]);
  const results = useMemo(() => {
    const scored = files
      .map((f) => ({ f, s: fuzzyScore(q, f.name) + fuzzyScore(q, f.path) * 0.1 }))
      .filter((x) => (q ? x.s > 0 : true))
      .sort((a, b) => b.s - a.s)
      .slice(0, 40);
    return scored.map((x) => x.f);
  }, [files, q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
    }
  }, [open]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  function pick(entry: FsEntry) {
    onPick(entry);
    onClose();
  }

  return (
    <ModalSheet open={open} title="Quick Open" onClose={onClose}>
      <input
        className="ui-input"
        autoFocus
        placeholder="Type a file name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIdx((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && results[idx]) {
            e.preventDefault();
            pick(results[idx]);
          }
        }}
      />
      <ul className="quick-open-list" role="listbox">
        {results.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              className="quick-open-item"
              role="option"
              aria-selected={i === idx}
              data-active={i === idx}
              onMouseEnter={() => setIdx(i)}
              onClick={() => pick(f)}
            >
              <span className="quick-open-item__name">{f.name}</span>
              <span className="quick-open-item__path">{f.path}</span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="quick-open-empty">No matches</li>}
      </ul>
    </ModalSheet>
  );
}
