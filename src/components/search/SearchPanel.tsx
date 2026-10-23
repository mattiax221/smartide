import { useState } from "react";
import { searchWorkspace, type SearchHit } from "../../lib/workspace";
import { Button, EmptyState, Input } from "../ui";

interface SearchPanelProps {
  hasWorkspace: boolean;
  onOpenHit: (hit: SearchHit) => void;
  onError: (err: unknown) => void;
}

export function SearchPanel({ hasWorkspace, onOpenHit, onError }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [glob, setGlob] = useState("*.{ts,tsx,js,jsx,rs,md,json,css,toml}");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!query.trim() || !hasWorkspace) return;
    setBusy(true);
    try {
      const res = await searchWorkspace(query, { caseSensitive, useRegex, glob });
      setHits(res);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="sidebar__header">
        <span>Search</span>
      </div>
      <div className="sidebar__body search-panel">
        {!hasWorkspace ? (
          <EmptyState title="No workspace" body="Open a folder to search in files." icon="⌕" />
        ) : (
          <>
            <Input
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void run();
              }}
            />
            <Input
              placeholder="Glob filter"
              value={glob}
              onChange={(e) => setGlob(e.target.value)}
            />
            <div className="search-panel__flags">
              <label>
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />{" "}
                Case
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={useRegex}
                  onChange={(e) => setUseRegex(e.target.checked)}
                />{" "}
                Regex
              </label>
              <Button variant="primary" disabled={busy || !query.trim()} onClick={() => void run()}>
                {busy ? "…" : "Find"}
              </Button>
            </div>
            <div className="search-hits">
              {hits.map((h, i) => (
                <button
                  key={`${h.path}:${h.line}:${i}`}
                  type="button"
                  className="search-hit"
                  onClick={() => onOpenHit(h)}
                >
                  <span className="search-hit__loc">
                    {h.path.split(/[/\\]/).pop()}:{h.line}
                  </span>
                  <span className="search-hit__preview">{h.preview}</span>
                </button>
              ))}
              {!busy && hits.length === 0 && query && (
                <p className="sidebar-empty">No results</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
