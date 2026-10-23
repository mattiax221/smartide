import type { OpenTab } from "../../state/types";
import { MonacoPane } from "../editor/MonacoPane";
import { SettingsView } from "../settings/SettingsView";
import { Button, EmptyState } from "../ui";

interface EditorAreaProps {
  showSettings: boolean;
  tabs: OpenTab[];
  activeTabId: string | null;
  secondaryTabId: string | null;
  splitEditor: boolean;
  onSelectTab: (id: string, pane?: "primary" | "secondary") => void;
  onCloseTab: (id: string) => void;
  onTogglePin: (id: string) => void;
  onChangeContent: (id: string, content: string) => void;
  onToggleSplit: () => void;
  onOpenExplorer: () => void;
}

function Breadcrumb({ path }: { path: string }) {
  const parts = path.split("/").filter(Boolean);
  return (
    <div className="editor-breadcrumb">
      {parts.map((seg, i) => (
        <span key={`${seg}-${i}`} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          {i > 0 ? <span className="editor-breadcrumb__sep">/</span> : null}
          <span
            className={`editor-breadcrumb__seg${i === parts.length - 1 ? " editor-breadcrumb__seg--file" : ""}`}
          >
            {seg}
          </span>
        </span>
      ))}
      <div className="editor-toolbar" />
    </div>
  );
}

function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onTogglePin,
  splitEditor,
  onToggleSplit,
}: {
  tabs: OpenTab[];
  activeId: string | null;
  onSelect: (id: string, pane?: "primary" | "secondary") => void;
  onClose: (id: string) => void;
  onTogglePin: (id: string) => void;
  splitEditor: boolean;
  onToggleSplit: () => void;
}) {
  const ordered = [...tabs].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  return (
    <div className="tab-bar" role="tablist" aria-label="Open editors">
      {ordered.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="tab"
          role="tab"
          data-dirty={tab.dirty}
          data-pinned={tab.pinned}
          aria-selected={tab.id === activeId}
          onClick={(e) => {
            onSelect(tab.id, e.altKey || e.metaKey ? "secondary" : "primary");
          }}
          onDoubleClick={() => onTogglePin(tab.id)}
          title="Double-click pin · Alt-click secondary (when split)"
        >
          <span className="tab__name">{tab.name}</span>
          <span className="tab__actions">
            <span
              className="tab__close"
              role="button"
              tabIndex={0}
              aria-label={`Close ${tab.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose(tab.id);
                }
              }}
            >
              ×
            </span>
          </span>
        </button>
      ))}
      <div className="editor-toolbar" style={{ marginLeft: "auto", paddingRight: 8 }}>
        <Button variant="subtle" onClick={onToggleSplit} aria-pressed={splitEditor}>
          {splitEditor ? "Unsplit" : "Split"}
        </Button>
      </div>
    </div>
  );
}

function Pane({
  tab,
  onChange,
}: {
  tab: OpenTab;
  onChange: (content: string) => void;
}) {
  return (
    <>
      <Breadcrumb path={tab.path} />
      <MonacoPane
        path={tab.path}
        language={tab.language}
        value={tab.content}
        onChange={onChange}
      />
    </>
  );
}

export function EditorArea({
  showSettings,
  tabs,
  activeTabId,
  secondaryTabId,
  splitEditor,
  onSelectTab,
  onCloseTab,
  onTogglePin,
  onChangeContent,
  onToggleSplit,
  onOpenExplorer,
}: EditorAreaProps) {
  if (showSettings) {
    return (
      <div className="editor-area">
        <SettingsView />
      </div>
    );
  }

  const active = tabs.find((t) => t.id === activeTabId) ?? null;
  const secondary = tabs.find((t) => t.id === secondaryTabId) ?? null;

  return (
    <div className="editor-area">
      {tabs.length > 0 && (
        <TabBar
          tabs={tabs}
          activeId={activeTabId}
          onSelect={onSelectTab}
          onClose={onCloseTab}
          onTogglePin={onTogglePin}
          splitEditor={splitEditor}
          onToggleSplit={onToggleSplit}
        />
      )}

      {active && splitEditor ? (
        <div className="editor-split">
          <div className="editor-split__pane">
            <Pane tab={active} onChange={(c) => onChangeContent(active.id, c)} />
          </div>
          <div className="editor-split__pane">
            {secondary ? (
              <Pane tab={secondary} onChange={(c) => onChangeContent(secondary.id, c)} />
            ) : (
              <EmptyState
                title="Pick a second file"
                body="Open another tab, then click it while split is on — or open two files first."
              />
            )}
          </div>
        </div>
      ) : active ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Pane tab={active} onChange={(c) => onChangeContent(active.id, c)} />
        </div>
      ) : (
        <div className="editor-welcome">
          <div className="editor-welcome__inner">
            <EmptyState
              title="SmartIDE"
              body="Open a file from the explorer, toggle AI Chat, or configure provider keys in Settings."
              actionLabel="Open explorer"
              onAction={onOpenExplorer}
              icon="S"
            />
          </div>
        </div>
      )}
    </div>
  );
}
