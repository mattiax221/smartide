import { DEMO_TREE, type DemoFile } from "../../lib/demoFiles";
import { IconFile, IconFolder } from "../icons";
import type { ActivityView } from "./ActivityBar";

interface SidebarProps {
  view: ActivityView;
  selectedFileId: string | null;
  onOpenFile: (file: DemoFile) => void;
}

function fileIconClass(name: string): string {
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "tree-item__icon tree-item__icon--ts";
  if (name.endsWith(".rs")) return "tree-item__icon tree-item__icon--rs";
  if (name.endsWith(".json")) return "tree-item__icon tree-item__icon--json";
  return "tree-item__icon";
}

function Explorer({
  selectedFileId,
  onOpenFile,
}: {
  selectedFileId: string | null;
  onOpenFile: (file: DemoFile) => void;
}) {
  return (
    <>
      <div className="sidebar__header">
        <span>Explorer</span>
        <span>SMARTIDE</span>
      </div>
      <div className="sidebar__body" role="tree" aria-label="File explorer">
        {DEMO_TREE.map((entry) => {
          if (entry.kind === "folder") {
            return (
              <div key={entry.id} className="tree-item" role="treeitem" aria-expanded>
                <IconFolder />
                <span>{entry.name}</span>
              </div>
            );
          }
          return (
            <button
              key={entry.id}
              type="button"
              className={`tree-item${entry.parent ? " tree-item--nested" : ""}`}
              role="treeitem"
              aria-selected={selectedFileId === entry.id}
              onClick={() => onOpenFile(entry)}
            >
              <IconFile className={fileIconClass(entry.name)} />
              <span>{entry.name}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <>
      <div className="sidebar__header">
        <span>{title}</span>
      </div>
      <div className="sidebar__body">
        <p className="sidebar-empty">{body}</p>
      </div>
    </>
  );
}

export function Sidebar({ view, selectedFileId, onOpenFile }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Sidebar">
      {view === "explorer" && (
        <Explorer selectedFileId={selectedFileId} onOpenFile={onOpenFile} />
      )}
      {view === "search" && (
        <Placeholder title="Search" body="Search across the workspace — coming soon." />
      )}
      {view === "git" && (
        <Placeholder title="Source Control" body="Git integration stub — coming soon." />
      )}
      {view === "extensions" && (
        <Placeholder title="Extensions" body="Extension marketplace stub — coming soon." />
      )}
      {view === "settings" && (
        <Placeholder
          title="Settings"
          body="AI provider keys and preferences open in the editor area."
        />
      )}
    </aside>
  );
}
