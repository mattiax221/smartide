interface StatusBarProps {
  fileLabel: string;
  language: string;
}

export function StatusBar({ fileLabel, language }: StatusBarProps) {
  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__left">
        <span className="status-item" title="Branch">
          main*
        </span>
        <span className="status-item" title="Errors / Warnings">
          0 ⚠  0
        </span>
      </div>
      <div className="status-bar__right">
        <span className="status-item">{fileLabel || "No file"}</span>
        <span className="status-item">{language || "Plain Text"}</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">LF</span>
        <span className="status-item">Spaces: 2</span>
      </div>
    </footer>
  );
}
