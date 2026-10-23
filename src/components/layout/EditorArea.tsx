import type { OpenTab, SettingsUiState } from "../../state/types";
import { MonacoPane } from "../editor/MonacoPane";
import { SettingsView } from "../settings/SettingsView";
import { Button, EmptyState, Tooltip } from "../ui";

interface EditorAreaProps {
  showSettings: boolean;
  tabs: OpenTab[];
  activeTabId: string | null;
  secondaryTabId: string | null;
  splitEditor: boolean;
  settings: SettingsUiState;
  onSelectTab: (id: string, pane?: "primary" | "secondary") => void;
  onCloseTab: (id: string) => void;
  onTogglePin: (id: string) => void;
  onChangeContent: (id: string, content: string) => void;
  onToggleSplit: () => void;
  onOpenExplorer: () => void;
  onSave: () => void;
  onOpenHelp: () => void;
}

function Breadcrumb({ path }: { path: string }) {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
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
  onSave,
  onOpenHelp,
}: {
  tabs: OpenTab[];
  activeId: string | null;
  onSelect: (id: string, pane?: "primary" | "secondary") => void;
  onClose: (id: string) => void;
  onTogglePin: (id: string) => void;
  splitEditor: boolean;
  onToggleSplit: () => void;
  onSave: () => void;
  onOpenHelp: () => void;
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
        >
          <Tooltip label={tab.path} side="bottom">
            <span className="tab__name">{tab.name}</span>
          </Tooltip>
          <span className="tab__actions">
            <Tooltip label={`Close ${tab.name}`} side="bottom">
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
            </Tooltip>
          </span>
        </button>
      ))}
      <div className="editor-toolbar" style={{ marginLeft: "auto", paddingRight: 8, gap: 6 }}>
        <Tooltip label="Save (Ctrl+S)" side="bottom">
          <Button variant="subtle" onClick={onSave}>
            Save
          </Button>
        </Tooltip>
        <Tooltip label="Split editor" side="bottom">
          <Button variant="subtle" onClick={onToggleSplit} aria-pressed={splitEditor}>
            {splitEditor ? "Unsplit" : "Split"}
          </Button>
        </Tooltip>
        <Tooltip label="Shortcuts" side="bottom">
          <Button variant="subtle" onClick={onOpenHelp}>
            ?
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

function Pane({
  tab,
  settings,
  onChange,
}: {
  tab: OpenTab;
  settings: SettingsUiState;
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
        settings={settings}
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
  settings,
  onSelectTab,
  onCloseTab,
  onTogglePin,
  onChangeContent,
  onToggleSplit,
  onOpenExplorer,
  onSave,
  onOpenHelp,
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
          onSave={onSave}
          onOpenHelp={onOpenHelp}
        />
      )}

      {active && splitEditor ? (
        <div className="editor-split">
          <div className="editor-split__pane">
            <Pane
              tab={active}
              settings={settings}
              onChange={(c) => onChangeContent(active.id, c)}
            />
          </div>
          <div className="editor-split__pane">
            {secondary ? (
              <Pane
                tab={secondary}
                settings={settings}
                onChange={(c) => onChangeContent(secondary.id, c)}
              />
            ) : (
              <EmptyState
                title="Pick a second file"
                body="Alt-click another tab to load it in the secondary pane."
              />
            )}
          </div>
        </div>
      ) : active ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Pane
            tab={active}
            settings={settings}
            onChange={(c) => onChangeContent(active.id, c)}
          />
        </div>
      ) : (
        <div className="editor-welcome">
          <div className="editor-welcome__inner">
            <EmptyState
              title="SmartIDE"
              body="Open a folder (Ctrl+O), pick a file, or use demo files. Toggle AI Chat from the spark icon."
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
