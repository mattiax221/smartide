import { useMemo } from "react";
import type { ContextFile } from "../../lib/ai";
import { useIdeStore } from "../../state/store";
import { ChatPanel } from "../chat/ChatPanel";
import { ToastHost } from "../ui";
import { ActivityBar } from "./ActivityBar";
import { BottomPanel } from "./BottomPanel";
import { EditorArea } from "./EditorArea";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

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

  return (
    <div className="ide-shell">
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
          onOpenFile={store.openFile}
          onOpenSettings={() => store.setActivity("settings")}
        />
        <div className="ide-main">
          <EditorArea
            showSettings={showSettings}
            tabs={state.tabs}
            activeTabId={state.activeTabId}
            secondaryTabId={state.secondaryTabId}
            splitEditor={state.splitEditor}
            onSelectTab={store.selectTab}
            onCloseTab={store.closeTab}
            onTogglePin={store.togglePin}
            onChangeContent={store.changeContent}
            onToggleSplit={store.toggleSplit}
            onOpenExplorer={() => store.setActivity("explorer")}
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
    </div>
  );
}
