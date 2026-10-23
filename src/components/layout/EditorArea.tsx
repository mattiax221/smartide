import type { DemoFile } from "../../lib/demoFiles";
import { MonacoPane } from "../editor/MonacoPane";
import { SettingsView } from "../settings/SettingsView";

export interface OpenTab {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
}

interface EditorAreaProps {
  showSettings: boolean;
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onChangeContent: (id: string, content: string) => void;
}

export function EditorArea({
  showSettings,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onChangeContent,
}: EditorAreaProps) {
  if (showSettings) {
    return (
      <div className="editor-area">
        <SettingsView />
      </div>
    );
  }

  const active = tabs.find((t) => t.id === activeTabId) ?? null;

  return (
    <div className="editor-area">
      {tabs.length > 0 && (
        <div className="tab-bar" role="tablist" aria-label="Open editors">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="tab"
              role="tab"
              aria-selected={tab.id === activeTabId}
              onClick={() => onSelectTab(tab.id)}
            >
              <span>{tab.name}</span>
              <span
                className="tab__close"
                role="button"
                tabIndex={0}
                aria-label={`Close ${tab.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      {active ? (
        <MonacoPane
          path={active.path}
          language={active.language}
          value={active.content}
          onChange={(content) => onChangeContent(active.id, content)}
        />
      ) : (
        <div className="editor-welcome">
          <div className="editor-welcome__inner">
            <h1 className="editor-welcome__brand">SmartIDE</h1>
            <p className="editor-welcome__hint">
              Open a file from the explorer, or open Settings to configure AI provider API keys.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function demoFileToTab(file: DemoFile): OpenTab {
  return {
    id: file.id,
    name: file.name,
    path: file.path,
    language: file.language,
    content: file.content,
  };
}
