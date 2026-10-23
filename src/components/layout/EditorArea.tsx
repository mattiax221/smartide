import { useRef, useState } from "react";
import type { OpenTab, SettingsUiState } from "../../state/types";
import { GoToLine } from "../editor/GoToLine";
import { MonacoPane, type MonacoReveal } from "../editor/MonacoPane";
import { SettingsView } from "../settings/SettingsView";
import { Button, EmptyState, Tooltip } from "../ui";

interface EditorAreaProps {
  showSettings: boolean;
  tabs: OpenTab[];
  activeTabId: string | null;
  secondaryTabId: string | null;
  splitEditor: boolean;
  settings: SettingsUiState;
  canNavBack: boolean;
  canNavForward: boolean;
  reveal: MonacoReveal | null;
  findTrigger: number;
  replaceTrigger: number;
  goToLineOpen: boolean;
  onSelectTab: (id: string, pane?: "primary" | "secondary") => void;
  onCloseTab: (id: string) => void;
  onTogglePin: (id: string) => void;
  onChangeContent: (id: string, content: string) => void;
  onToggleSplit: () => void;
  onOpenExplorer: () => void;
  onSave: () => void;
  onOpenHelp: () => void;
  onReorderTabs: (from: number, to: number) => void;
  onCloseOtherTabs: (id: string) => void;
  onCloseTabsToRight: (id: string) => void;
  onNavBack: () => void;
  onNavForward: () => void;
  onFind: () => void;
  onReplace: () => void;
  onGoToLineOpen: (open: boolean) => void;
  onGoToLine: (line: number) => void;
  onDropPath: (path: string) => void;
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
  onReorderTabs,
  onCloseOtherTabs,
  onCloseTabsToRight,
  canNavBack,
  canNavForward,
  onNavBack,
  onNavForward,
  onFind,
  onReplace,
  onGoToLine,
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
  onReorderTabs: (from: number, to: number) => void;
  onCloseOtherTabs: (id: string) => void;
  onCloseTabsToRight: (id: string) => void;
  canNavBack: boolean;
  canNavForward: boolean;
  onNavBack: () => void;
  onNavForward: () => void;
  onFind: () => void;
  onReplace: () => void;
  onGoToLine: () => void;
}) {
  const dragFrom = useRef<number | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; id: string } | null>(null);

  return (
    <div className="tab-bar" role="tablist" aria-label="Open editors" onClick={() => setCtx(null)}>
      <div className="tab-bar__nav">
        <Tooltip label="Go Back (Alt+←)" side="bottom">
          <Button variant="subtle" disabled={!canNavBack} onClick={onNavBack} aria-label="Go back">
            ←
          </Button>
        </Tooltip>
        <Tooltip label="Go Forward (Alt+→)" side="bottom">
          <Button
            variant="subtle"
            disabled={!canNavForward}
            onClick={onNavForward}
            aria-label="Go forward"
          >
            →
          </Button>
        </Tooltip>
      </div>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          className="tab"
          role="tab"
          data-dirty={tab.dirty}
          data-pinned={tab.pinned}
          aria-selected={tab.id === activeId}
          draggable
          onDragStart={() => {
            dragFrom.current = index;
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragFrom.current === null || dragFrom.current === index) return;
            onReorderTabs(dragFrom.current, index);
            dragFrom.current = null;
          }}
          onClick={(e) => {
            onSelect(tab.id, e.altKey || e.metaKey ? "secondary" : "primary");
          }}
          onDoubleClick={() => onTogglePin(tab.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setCtx({ x: e.clientX, y: e.clientY, id: tab.id });
          }}
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
        <Tooltip label="Find (Ctrl+F)" side="bottom">
          <Button variant="subtle" onClick={onFind}>
            Find
          </Button>
        </Tooltip>
        <Tooltip label="Replace (Ctrl+H)" side="bottom">
          <Button variant="subtle" onClick={onReplace}>
            Replace
          </Button>
        </Tooltip>
        <Tooltip label="Go to Line (Ctrl+G)" side="bottom">
          <Button variant="subtle" onClick={onGoToLine}>
            Go to…
          </Button>
        </Tooltip>
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

      {ctx && (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose(ctx.id);
              setCtx(null);
            }}
          >
            Close
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCloseOtherTabs(ctx.id);
              setCtx(null);
            }}
          >
            Close Others
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCloseTabsToRight(ctx.id);
              setCtx(null);
            }}
          >
            Close to the Right
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onTogglePin(ctx.id);
              setCtx(null);
            }}
          >
            Toggle Pin
          </button>
        </div>
      )}
    </div>
  );
}

function Pane({
  tab,
  settings,
  onChange,
  reveal,
  findTrigger,
  replaceTrigger,
}: {
  tab: OpenTab;
  settings: SettingsUiState;
  onChange: (content: string) => void;
  reveal: MonacoReveal | null;
  findTrigger: number;
  replaceTrigger: number;
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
        reveal={reveal}
        findTrigger={findTrigger}
        replaceTrigger={replaceTrigger}
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
  canNavBack,
  canNavForward,
  reveal,
  findTrigger,
  replaceTrigger,
  goToLineOpen,
  onSelectTab,
  onCloseTab,
  onTogglePin,
  onChangeContent,
  onToggleSplit,
  onOpenExplorer,
  onSave,
  onOpenHelp,
  onReorderTabs,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onNavBack,
  onNavForward,
  onFind,
  onReplace,
  onGoToLineOpen,
  onGoToLine,
  onDropPath,
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
  const maxLine = active ? active.content.split("\n").length : undefined;

  return (
    <div
      className="editor-area"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-smartide-path")) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        const path =
          e.dataTransfer.getData("application/x-smartide-path") ||
          e.dataTransfer.getData("text/plain");
        if (path) {
          e.preventDefault();
          onDropPath(path);
        }
      }}
    >
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
          onReorderTabs={onReorderTabs}
          onCloseOtherTabs={onCloseOtherTabs}
          onCloseTabsToRight={onCloseTabsToRight}
          canNavBack={canNavBack}
          canNavForward={canNavForward}
          onNavBack={onNavBack}
          onNavForward={onNavForward}
          onFind={onFind}
          onReplace={onReplace}
          onGoToLine={() => onGoToLineOpen(true)}
        />
      )}

      {active && splitEditor ? (
        <div className="editor-split">
          <div className="editor-split__pane">
            <Pane
              tab={active}
              settings={settings}
              onChange={(c) => onChangeContent(active.id, c)}
              reveal={reveal}
              findTrigger={findTrigger}
              replaceTrigger={replaceTrigger}
            />
          </div>
          <div className="editor-split__pane">
            {secondary ? (
              <Pane
                tab={secondary}
                settings={settings}
                onChange={(c) => onChangeContent(secondary.id, c)}
                reveal={null}
                findTrigger={0}
                replaceTrigger={0}
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
            reveal={reveal}
            findTrigger={findTrigger}
            replaceTrigger={replaceTrigger}
          />
        </div>
      ) : (
        <div className="editor-welcome">
          <div className="editor-welcome__inner">
            <EmptyState
              title="SmartIDE"
              body="Open a folder (Ctrl+O), Quick Open (Ctrl+P), or use demo files. Toggle AI Chat from the spark icon."
              actionLabel="Open explorer"
              onAction={onOpenExplorer}
              icon="S"
            />
          </div>
        </div>
      )}

      <GoToLine
        open={goToLineOpen}
        maxLine={maxLine}
        onClose={() => onGoToLineOpen(false)}
        onGo={onGoToLine}
      />
    </div>
  );
}
