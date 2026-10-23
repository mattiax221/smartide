import { useMemo, useState } from "react";
import type { DemoFile } from "../../lib/demoFiles";
import { ActivityBar, type ActivityView } from "./ActivityBar";
import { BottomPanel } from "./BottomPanel";
import { demoFileToTab, EditorArea, type OpenTab } from "./EditorArea";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

export function IdeShell() {
  const [activity, setActivity] = useState<ActivityView>("explorer");
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const showSettings = activity === "settings";

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  function openFile(file: DemoFile) {
    if (file.kind !== "file") return;
    setActivity("explorer");
    setTabs((prev) => {
      if (prev.some((t) => t.id === file.id)) return prev;
      return [...prev, demoFileToTab(file)];
    });
    setActiveTabId(file.id);
  }

  function closeTab(id: string) {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next.length ? next[next.length - 1].id : null);
      }
      return next;
    });
  }

  function changeContent(id: string, content: string) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
  }

  return (
    <div className="ide-shell">
      <div className="ide-body">
        <ActivityBar active={activity} onSelect={setActivity} />
        <Sidebar
          view={activity === "settings" ? "settings" : activity}
          selectedFileId={activeTabId}
          onOpenFile={openFile}
        />
        <div className="ide-main">
          <EditorArea
            showSettings={showSettings}
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
            onChangeContent={changeContent}
          />
          <BottomPanel
            collapsed={panelCollapsed}
            onToggle={() => setPanelCollapsed((c) => !c)}
          />
        </div>
      </div>
      <StatusBar
        fileLabel={showSettings ? "Settings" : activeTab?.path ?? ""}
        language={showSettings ? "" : activeTab?.language ?? ""}
      />
    </div>
  );
}
