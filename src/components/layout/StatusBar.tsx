interface StatusBarProps {
  fileLabel: string;
  language: string;
  providerHint?: string;
}

export function StatusBar({ fileLabel, language, providerHint }: StatusBarProps) {
  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__left">
        <span className="status-item status-item--accent" title="Brand">
          SmartIDE
        </span>
        <span className="status-item" title="Branch">
          main*
        </span>
      </div>
      <div className="status-bar__right">
        {providerHint ? <span className="status-item status-item--accent">{providerHint}</span> : null}
        <span className="status-item">{fileLabel || "No file"}</span>
        <span className="status-item">{language || "Plain Text"}</span>
        <span className="status-item">UTF-8</span>
      </div>
    </footer>
  );
}
