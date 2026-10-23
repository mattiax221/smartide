import { useState, type ReactNode } from "react";
import { DEMO_TREE, type DemoFile } from "../../lib/demoFiles";
import { IconFile, IconFolder } from "../icons";
import { EmptyState } from "../ui";
import type { ActivityView } from "./ActivityView";

interface SidebarProps {
  view: ActivityView;
  selectedFileId: string | null;
  workspaceLabel: string;
  onOpenFile: (file: DemoFile) => void;
  onOpenSettings: () => void;
}

function fileIconClass(name: string): string {
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "tree-item__icon tree-item__icon--ts";
  if (name.endsWith(".rs")) return "tree-item__icon tree-item__icon--rs";
  if (name.endsWith(".json")) return "tree-item__icon tree-item__icon--json";
  return "tree-item__icon";
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-section" data-open={open}>
      <button
        type="button"
        className="sidebar-section__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sidebar-section__chevron">▾</span>
        {title}
      </button>
      <div className="sidebar-section__body">{children}</div>
    </div>
  );
}

function Explorer({
  selectedFileId,
  workspaceLabel,
  onOpenFile,
}: {
  selectedFileId: string | null;
  workspaceLabel: string;
  onOpenFile: (file: DemoFile) => void;
}) {
  const files = DEMO_TREE.filter((e) => e.kind === "file");
  return (
    <>
      <div className="sidebar__header">
        <span>Explorer</span>
        <span>{workspaceLabel}</span>
      </div>
      <div className="sidebar__body" role="tree" aria-label="File explorer">
        {files.length === 0 ? (
          <EmptyState
            title="No workspace"
            body="Open a folder to browse files. Demo tree ships until Fase D."
            icon="⌀"
          />
        ) : (
          <CollapsibleSection title="Demo project" defaultOpen>
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
          </CollapsibleSection>
        )}
      </div>
    </>
  );
}

export function Sidebar({
  view,
  selectedFileId,
  workspaceLabel,
  onOpenFile,
  onOpenSettings,
}: SidebarProps) {
  return (
    <aside className="sidebar" data-view={view} aria-label="Sidebar">
      {view === "explorer" && (
        <Explorer
          selectedFileId={selectedFileId}
          workspaceLabel={workspaceLabel}
          onOpenFile={onOpenFile}
        />
      )}
      {view === "search" && (
        <>
          <div className="sidebar__header">
            <span>Search</span>
          </div>
          <div className="sidebar__body">
            <EmptyState
              title="Search coming soon"
              body="Fuzzy file open and in-files search land in Fase F."
              icon="⌕"
            />
          </div>
        </>
      )}
      {view === "git" && (
        <>
          <div className="sidebar__header">
            <span>Source Control</span>
          </div>
          <div className="sidebar__body">
            <EmptyState title="No Git yet" body="Source control UI is stubbed for a later phase." icon="⌥" />
          </div>
        </>
      )}
      {view === "extensions" && (
        <>
          <div className="sidebar__header">
            <span>Extensions</span>
          </div>
          <div className="sidebar__body">
            <EmptyState title="No extensions" body="Marketplace is out of scope for the scaffold." icon="▣" />
          </div>
        </>
      )}
      {view === "settings" && (
        <>
          <div className="sidebar__header">
            <span>Settings</span>
          </div>
          <div className="sidebar__body">
            <EmptyState
              title="API keys & prefs"
              body="Provider keys open in the editor area. Keep vault secrets on the host."
              actionLabel="Focus settings"
              onAction={onOpenSettings}
              icon="⚙"
            />
          </div>
        </>
      )}
    </aside>
  );
}
