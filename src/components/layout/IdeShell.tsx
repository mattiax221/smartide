import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContextFile } from "../../lib/ai";
import type { DemoFile } from "../../lib/demoFiles";
import {
  createWorkspaceDir,
  createWorkspaceFile,
  deleteWorkspacePath,
  joinPath,
  listWorkspace,
  openWorkspace,
  pickFolder,
  readWorkspaceFile,
  renameWorkspacePath,
  revealInOs,
  writeWorkspaceFile,
  type FsEntry,
  type SearchHit,
} from "../../lib/workspace";
import { useIdeStore } from "../../state/store";
import { ChatPanel } from "../chat/ChatPanel";
import type { MonacoReveal } from "../editor/MonacoPane";
import { QuickOpen } from "../search/QuickOpen";
import { Button, ModalSheet, ToastHost } from "../ui";
import { ActivityBar } from "./ActivityBar";
import { BottomPanel } from "./BottomPanel";
import { EditorArea } from "./EditorArea";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { TitleBar } from "./TitleBar";

function promptName(message: string, initial = ""): string | null {
  const name = window.prompt(message, initial);
  if (name === null) return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("\\")) {
    return null;
  }
  return trimmed;
}

export function IdeShell() {
  const store = useIdeStore();
  const { state } = store;
  const showSettings = state.activity === "settings";
  const [reveal, setReveal] = useState<MonacoReveal | null>(null);
  const [findTrigger, setFindTrigger] = useState(0);
  const [replaceTrigger, setReplaceTrigger] = useState(0);
  const [goToLineOpen, setGoToLineOpen] = useState(false);

  const activeTab = useMemo(
    () => state.tabs.find((t) => t.id === state.activeTabId) ?? null,
    [state.tabs, state.activeTabId],
  );

  const contextFile: ContextFile | null = useMemo(() => {
    if (!activeTab || showSettings) return null;
    return {
      path: activeTab.path,
      language: activeTab.language,
      content: activeTab.content,
    };
  }, [activeTab, showSettings]);

  const openFolderPath = useCallback(
    async (path: string) => {
      try {
        const entries = await openWorkspace(path);
        store.setWorkspace(path, entries);
        store.pushToast("success", "Workspace opened", path);
      } catch (e) {
        store.notifyHostError(e, "Failed to open folder");
      }
    },
    [store],
  );

  const onOpenFolder = useCallback(async () => {
    try {
      const path = await pickFolder();
      if (!path) return;
      await openFolderPath(path);
    } catch (e) {
      store.notifyHostError(e, "Folder dialog failed");
    }
  }, [openFolderPath, store]);

  const onRefresh = useCallback(async () => {
    try {
      const entries = await listWorkspace();
      store.setEntries(entries);
    } catch (e) {
      store.notifyHostError(e, "Refresh failed");
    }
  }, [store]);

  const onOpenFsEntry = useCallback(
    async (entry: FsEntry) => {
      if (entry.kind !== "file") return;
      try {
        const content = await readWorkspaceFile(entry.path);
        store.openRealFile(entry, content);
        setReveal(null);
      } catch (e) {
        store.notifyHostError(e, "Failed to open file");
      }
    },
    [store],
  );

  const openPath = useCallback(
    async (path: string, line?: number, column?: number) => {
      const existing = state.tabs.find((t) => t.id === path || t.path === path);
      if (existing) {
        store.selectTab(existing.id);
      } else {
        const entry =
          state.workspace.entries.find((e) => e.path === path) ??
          ({
            id: path,
            name: path.split(/[/\\]/).pop() || path,
            path,
            kind: "file",
            parent: null,
            language: "",
          } satisfies FsEntry);
        try {
          const content = await readWorkspaceFile(path);
          store.openRealFile(entry, content);
        } catch (e) {
          store.notifyHostError(e, "Failed to open file");
          return;
        }
      }
      if (line != null) {
        setReveal({ line, column });
      }
    },
    [state.tabs, state.workspace.entries, store],
  );

  const onOpenDemoFile = useCallback(
    (file: DemoFile) => {
      store.openDemoFile(file);
      setReveal(null);
    },
    [store],
  );

  const saveActive = useCallback(async () => {
    if (!activeTab) return;
    if (!activeTab.real) {
      store.pushToast("info", "Demo file", "Open a real folder to save to disk");
      store.markSaved(activeTab.id);
      return;
    }
    try {
      await writeWorkspaceFile(activeTab.path, activeTab.content);
      store.markSaved(activeTab.id);
      store.pushToast("success", "Saved", activeTab.name);
    } catch (e) {
      store.notifyHostError(e, "Save failed");
    }
  }, [activeTab, store]);

  const onNewFile = useCallback(
    async (parentDir: string) => {
      const name = promptName("New file name");
      if (!name) return;
      const path = joinPath(parentDir, name);
      try {
        await createWorkspaceFile(path, "");
        await onRefresh();
        await openPath(path);
        store.pushToast("success", "File created", name);
      } catch (e) {
        store.notifyHostError(e, "Create file failed");
      }
    },
    [onRefresh, openPath, store],
  );

  const onNewFolder = useCallback(
    async (parentDir: string) => {
      const name = promptName("New folder name");
      if (!name) return;
      const path = joinPath(parentDir, name);
      try {
        await createWorkspaceDir(path);
        await onRefresh();
        store.pushToast("success", "Folder created", name);
      } catch (e) {
        store.notifyHostError(e, "Create folder failed");
      }
    },
    [onRefresh, store],
  );

  const onRename = useCallback(
    async (entry: FsEntry) => {
      const name = promptName("Rename to", entry.name);
      if (!name || name === entry.name) return;
      const parent = entry.path.replace(/[/\\][^/\\]+$/, "");
      const to = joinPath(parent, name);
      try {
        await renameWorkspacePath(entry.path, to);
        await onRefresh();
        store.pushToast("success", "Renamed", name);
      } catch (e) {
        store.notifyHostError(e, "Rename failed");
      }
    },
    [onRefresh, store],
  );

  const onDelete = useCallback(
    async (entry: FsEntry) => {
      if (!window.confirm(`Delete “${entry.name}”?`)) return;
      try {
        await deleteWorkspacePath(entry.path);
        if (state.tabs.some((t) => t.path === entry.path || t.id === entry.path)) {
          store.closeTab(entry.path);
        }
        await onRefresh();
        store.pushToast("info", "Deleted", entry.name);
      } catch (e) {
        store.notifyHostError(e, "Delete failed");
      }
    },
    [onRefresh, state.tabs, store],
  );

  const onRevealOs = useCallback(
    async (path: string) => {
      try {
        await revealInOs(path);
      } catch (e) {
        store.notifyHostError(e, "Reveal failed");
      }
    },
    [store],
  );

  const onSearchHit = useCallback(
    (hit: SearchHit) => {
      void openPath(hit.path, hit.line, hit.column);
    },
    [openPath],
  );

  // File watch → refresh explorer
  useEffect(() => {
    if (!state.workspace.rootPath) return;
    let un: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void listen("workspace-changed", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void onRefresh();
      }, 300);
    }).then((fn) => {
      un = fn;
    });
    return () => {
      clearTimeout(timer);
      un?.();
    };
  }, [state.workspace.rootPath, onRefresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveActive();
      }
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        store.setQuickOpen(true);
      }
      if (mod && e.key.toLowerCase() === "b" && !inInput) {
        e.preventDefault();
        store.setActivity(state.activity === "explorer" ? "search" : "explorer");
      }
      if (mod && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (state.activeTabId) store.closeTab(state.activeTabId);
      }
      if (mod && e.key === "Tab") {
        e.preventDefault();
        store.cycleTab(e.shiftKey ? -1 : 1);
      }
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        void onOpenFolder();
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        store.setActivity("settings");
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setGoToLineOpen(true);
      }
      if (mod && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setReplaceTrigger((n) => n + 1);
      }
      if (mod && e.key.toLowerCase() === "f" && !e.shiftKey) {
        // Let Monaco handle when focused; also bump our trigger for toolbar parity
        setFindTrigger((n) => n + 1);
      }
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        store.navBack();
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        store.navForward();
      }
      if (mod && e.key === "`") {
        e.preventDefault();
        if (state.panelCollapsed || state.panelTab !== "terminal") {
          store.setPanelTab("terminal");
        } else {
          store.setPanelCollapsed(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    saveActive,
    store,
    state.activity,
    state.activeTabId,
    state.panelCollapsed,
    state.panelTab,
    onOpenFolder,
  ]);

  const canNavBack = state.navIndex > 0;
  const canNavForward =
    state.navIndex >= 0 && state.navIndex < state.navHistory.length - 1;

  return (
    <div className="ide-shell">
      <TitleBar />
      <ToastHost />
      <div className="ide-body" data-chat-open={state.ai.chatOpen}>
        <ActivityBar
          active={state.activity}
          chatOpen={state.ai.chatOpen}
          onSelect={store.setActivity}
          onToggleChat={store.toggleChat}
        />
        <Sidebar
          view={state.activity}
          selectedFileId={state.activeTabId}
          workspaceLabel={state.workspace.rootLabel}
          workspaceRoot={state.workspace.rootPath}
          entries={state.workspace.entries}
          recent={state.workspace.recent}
          onOpenDemoFile={onOpenDemoFile}
          onOpenFsEntry={(e) => void onOpenFsEntry(e)}
          onOpenFolder={() => void onOpenFolder()}
          onOpenRecent={(p) => void openFolderPath(p)}
          onRefresh={() => void onRefresh()}
          onOpenSettings={() => store.setActivity("settings")}
          onNewFile={(dir) => void onNewFile(dir)}
          onNewFolder={(dir) => void onNewFolder(dir)}
          onRename={(entry) => void onRename(entry)}
          onDelete={(entry) => void onDelete(entry)}
          onReveal={(p) => void onRevealOs(p)}
          onSearchHit={onSearchHit}
          onError={(err) => store.notifyHostError(err)}
        />
        <div className="ide-main">
          <EditorArea
            showSettings={showSettings}
            tabs={state.tabs}
            activeTabId={state.activeTabId}
            secondaryTabId={state.secondaryTabId}
            splitEditor={state.splitEditor}
            settings={state.settings}
            canNavBack={canNavBack}
            canNavForward={canNavForward}
            reveal={reveal}
            findTrigger={findTrigger}
            replaceTrigger={replaceTrigger}
            goToLineOpen={goToLineOpen}
            onSelectTab={store.selectTab}
            onCloseTab={store.closeTab}
            onTogglePin={store.togglePin}
            onChangeContent={store.changeContent}
            onToggleSplit={store.toggleSplit}
            onOpenExplorer={() => store.setActivity("explorer")}
            onSave={() => void saveActive()}
            onOpenHelp={() => store.setHelpOpen(true)}
            onReorderTabs={store.reorderTabs}
            onCloseOtherTabs={store.closeOtherTabs}
            onCloseTabsToRight={store.closeTabsToRight}
            onNavBack={store.navBack}
            onNavForward={store.navForward}
            onFind={() => setFindTrigger((n) => n + 1)}
            onReplace={() => setReplaceTrigger((n) => n + 1)}
            onGoToLineOpen={setGoToLineOpen}
            onGoToLine={(line) => setReveal({ line })}
            onDropPath={(path) => void openPath(path)}
          />
          <BottomPanel
            collapsed={state.panelCollapsed}
            height={state.panelHeight}
            tab={state.panelTab}
            onToggle={() => store.setPanelCollapsed(!state.panelCollapsed)}
            onTab={store.setPanelTab}
            onResize={store.setPanelHeight}
            onError={(err) => store.notifyHostError(err, "Terminal error")}
          />
        </div>
        <ChatPanel open={state.ai.chatOpen} contextFile={contextFile} />
      </div>
      <StatusBar
        fileLabel={showSettings ? "Settings" : activeTab?.path ?? ""}
        language={showSettings ? "" : activeTab?.language ?? ""}
        providerId={state.ai.providerId}
        modelId={state.ai.modelId}
        chatOpen={state.ai.chatOpen}
        dirty={Boolean(activeTab?.dirty)}
        zoom="100%"
      />

      <QuickOpen
        open={state.quickOpen}
        entries={state.workspace.entries}
        onClose={() => store.setQuickOpen(false)}
        onPick={(entry) => void onOpenFsEntry(entry)}
      />

      <ModalSheet
        open={state.helpOpen}
        title="Keyboard shortcuts"
        onClose={() => store.setHelpOpen(false)}
        footer={
          <Button variant="primary" onClick={() => store.setHelpOpen(false)}>
            Got it
          </Button>
        }
      >
        <ul className="shortcut-list">
          <li>
            <kbd>Ctrl</kbd>+<kbd>O</kbd> Open folder
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>P</kbd> Quick Open
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>S</kbd> Save file
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>F</kbd> Find in file
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>H</kbd> Replace in file
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>G</kbd> Go to line
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>W</kbd> Close tab
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>Tab</kbd> Next tab
          </li>
          <li>
            <kbd>Alt</kbd>+<kbd>←</kbd>/<kbd>→</kbd> Navigate history
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>`</kbd> Toggle terminal
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>,</kbd> Settings
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>B</kbd> Toggle sidebar view
          </li>
        </ul>
      </ModalSheet>
    </div>
  );
}
