interface StatusBarProps {
  fileLabel: string;
  language: string;
  providerId: string;
  modelId: string;
  chatOpen: boolean;
  dirty: boolean;
  zoom: string;
}

export function StatusBar({
  fileLabel,
  language,
  providerId,
  modelId,
  chatOpen,
  dirty,
  zoom,
}: StatusBarProps) {
  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__left">
        <span className="status-item status-item--accent" title="Brand">
          SmartIDE
        </span>
        <span className="status-item" title="Branch">
          main*
        </span>
        <span className="status-item status-item--muted" title="Diagnostics">
          0 ✕  0 ⚠
        </span>
      </div>
      <div className="status-bar__right">
        {chatOpen ? (
          <span className="status-item status-item--accent" title="Active AI">
            {providerId}/{modelId}
          </span>
        ) : (
          <span className="status-item status-item--muted">AI hidden</span>
        )}
        <span className="status-item">{dirty ? "● Modified" : "Saved"}</span>
        <span className="status-item">{fileLabel || "No file"}</span>
        <span className="status-item">{language || "Plain Text"}</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">{zoom}</span>
      </div>
    </footer>
  );
}
