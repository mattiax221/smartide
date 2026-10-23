import { useCallback, useEffect, useMemo } from "react";
import type { ContextFile } from "../../lib/ai";
import type { DemoFile } from "../../lib/demoFiles";
import {
  listWorkspace,
  openWorkspace,
  pickFolder,
  readWorkspaceFile,
  writeWorkspaceFile,
  type FsEntry,
} from "../../lib/workspace";
import { useIdeStore } from "../../state/store";
import { ChatPanel } from "../chat/ChatPanel";
import { Button, ModalSheet, ToastHost } from "../ui";
import { ActivityBar } from "./ActivityBar";
import { BottomPanel } from "./BottomPanel";
import { EditorArea } from "./EditorArea";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { TitleBar } from "./TitleBar";

export function IdeShell() {
  const store = useIdeStore();
  const { state } = store;
  const showSettings = state.activity === "settings";

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
      store.pushToast("info", "Explorer refreshed");
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
      } catch (e) {
        store.notifyHostError(e, "Failed to open file");
      }
    },
    [store],
  );

  const onOpenDemoFile = useCallback(
    (file: DemoFile) => {
      store.openDemoFile(file);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveActive();
      }
      if (mod && e.key.toLowerCase() === "b") {
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveActive, store, state.activity, state.activeTabId, onOpenFolder]);

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
        />
        <div className="ide-main">
          <EditorArea
            showSettings={showSettings}
            tabs={state.tabs}
            activeTabId={state.activeTabId}
            secondaryTabId={state.secondaryTabId}
            splitEditor={state.splitEditor}
            settings={state.settings}
            onSelectTab={store.selectTab}
            onCloseTab={store.closeTab}
            onTogglePin={store.togglePin}
            onChangeContent={store.changeContent}
            onToggleSplit={store.toggleSplit}
            onOpenExplorer={() => store.setActivity("explorer")}
            onSave={() => void saveActive()}
            onOpenHelp={() => store.setHelpOpen(true)}
          />
          <BottomPanel
            collapsed={state.panelCollapsed}
            height={state.panelHeight}
            tab={state.panelTab}
            onToggle={() => store.setPanelCollapsed(!state.panelCollapsed)}
            onTab={store.setPanelTab}
            onResize={store.setPanelHeight}
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
            <kbd>Ctrl</kbd>+<kbd>S</kbd> Save file
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>W</kbd> Close tab
          </li>
          <li>
            <kbd>Ctrl</kbd>+<kbd>Tab</kbd> Next tab
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
