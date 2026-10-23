import { useMemo, useState, type ReactNode } from "react";
import { DEMO_TREE, type DemoFile } from "../../lib/demoFiles";
import { basename, type FsEntry } from "../../lib/workspace";
import { SearchPanel } from "../search/SearchPanel";
import type { SearchHit } from "../../lib/workspace";
import { IconFile, IconFolder } from "../icons";
import { Button, EmptyState, Tooltip } from "../ui";
import type { ActivityView } from "./ActivityView";

interface SidebarProps {
  view: ActivityView;
  selectedFileId: string | null;
  workspaceLabel: string;
  workspaceRoot: string | null;
  entries: FsEntry[];
  recent: string[];
  onOpenDemoFile: (file: DemoFile) => void;
  onOpenFsEntry: (entry: FsEntry) => void;
  onOpenFolder: () => void;
  onOpenRecent: (path: string) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onNewFile: (parentDir: string) => void;
  onNewFolder: (parentDir: string) => void;
  onRename: (entry: FsEntry) => void;
  onDelete: (entry: FsEntry) => void;
  onReveal: (path: string) => void;
  onSearchHit: (hit: SearchHit) => void;
  onError: (err: unknown) => void;
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

function depthOf(entry: FsEntry, byId: Map<string, FsEntry>): number {
  let d = 0;
  let p = entry.parent;
  while (p) {
    d += 1;
    p = byId.get(p)?.parent ?? null;
    if (d > 32) break;
  }
  return d;
}

interface CtxMenu {
  x: number;
  y: number;
  entry: FsEntry | null;
}

export function Sidebar({
  view,
  selectedFileId,
  workspaceLabel,
  workspaceRoot,
  entries,
  recent,
  onOpenDemoFile,
  onOpenFsEntry,
  onOpenFolder,
  onOpenRecent,
  onRefresh,
  onOpenSettings,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onReveal,
  onSearchHit,
  onError,
}: SidebarProps) {
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const [menu, setMenu] = useState<CtxMenu | null>(null);

  function openMenu(e: React.MouseEvent, entry: FsEntry | null) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, entry });
  }

  function closeMenu() {
    setMenu(null);
  }

  const parentForNew = menu?.entry
    ? menu.entry.kind === "folder"
      ? menu.entry.path
      : menu.entry.parent
        ? byId.get(menu.entry.parent)?.path ?? workspaceRoot
        : workspaceRoot
    : workspaceRoot;

  return (
    <aside className="sidebar" data-view={view} aria-label="Sidebar" onClick={closeMenu}>
      {view === "explorer" && (
        <>
          <div className="sidebar__header">
            <span>Explorer</span>
            <span>{workspaceLabel}</span>
          </div>
          <div
            className="sidebar__body"
            role="tree"
            aria-label="File explorer"
            onContextMenu={(e) => {
              if (workspaceRoot) openMenu(e, null);
            }}
          >
            <div className="sidebar-actions">
              <Button variant="primary" onClick={onOpenFolder}>
                Open Folder
              </Button>
              {workspaceRoot ? (
                <>
                  <Tooltip label="New file" side="bottom">
                    <Button variant="ghost" onClick={() => onNewFile(workspaceRoot)}>
                      +File
                    </Button>
                  </Tooltip>
                  <Tooltip label="New folder" side="bottom">
                    <Button variant="ghost" onClick={() => onNewFolder(workspaceRoot)}>
                      +Dir
                    </Button>
                  </Tooltip>
                  <Button variant="ghost" onClick={onRefresh}>
                    Refresh
                  </Button>
                </>
              ) : null}
            </div>

            {workspaceRoot && entries.length > 0 ? (
              <CollapsibleSection title={workspaceLabel} defaultOpen>
                {entries.map((entry) => {
                  const depth = depthOf(entry, byId);
                  if (entry.kind === "folder") {
                    return (
                      <div
                        key={entry.id}
                        className="tree-item"
                        role="treeitem"
                        aria-expanded
                        style={{ paddingLeft: 10 + depth * 12 }}
                        onContextMenu={(e) => openMenu(e, entry)}
                        draggable={false}
                      >
                        <IconFolder />
                        <span>{entry.name}</span>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className="tree-item"
                      role="treeitem"
                      aria-selected={selectedFileId === entry.id}
                      style={{ paddingLeft: 10 + depth * 12 }}
                      onClick={() => onOpenFsEntry(entry)}
                      onContextMenu={(e) => openMenu(e, entry)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/x-smartide-path", entry.path);
                        e.dataTransfer.setData("text/plain", entry.path);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                    >
                      <IconFile className={fileIconClass(entry.name)} />
                      <span>{entry.name}</span>
                    </button>
                  );
                })}
              </CollapsibleSection>
            ) : (
              <EmptyState
                title="No folder open"
                body="Open a folder to browse real files. Demo files stay available below until you do."
                actionLabel="Open Folder"
                onAction={onOpenFolder}
                icon="⌀"
              />
            )}

            {!workspaceRoot && (
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
                      onClick={() => onOpenDemoFile(entry)}
                    >
                      <IconFile className={fileIconClass(entry.name)} />
                      <span>{entry.name}</span>
                    </button>
                  );
                })}
              </CollapsibleSection>
            )}

            {recent.length > 0 && (
              <CollapsibleSection title="Recent" defaultOpen={false}>
                {recent.map((path) => (
                  <button
                    key={path}
                    type="button"
                    className="tree-item"
                    title={path}
                    onClick={() => onOpenRecent(path)}
                  >
                    <span className="tree-item__path">{basename(path) || path}</span>
                  </button>
                ))}
              </CollapsibleSection>
            )}
          </div>

          {menu && workspaceRoot && (
            <div
              className="ctx-menu"
              style={{ left: menu.x, top: menu.y }}
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (parentForNew) onNewFile(parentForNew);
                  closeMenu();
                }}
              >
                New File
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (parentForNew) onNewFolder(parentForNew);
                  closeMenu();
                }}
              >
                New Folder
              </button>
              {menu.entry && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onRename(menu.entry!);
                      closeMenu();
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onDelete(menu.entry!);
                      closeMenu();
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onReveal(menu.entry!.path);
                      closeMenu();
                    }}
                  >
                    Reveal in OS
                  </button>
                </>
              )}
              {!menu.entry && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onReveal(workspaceRoot);
                    closeMenu();
                  }}
                >
                  Reveal workspace
                </button>
              )}
            </div>
          )}
        </>
      )}

      {view === "search" && (
        <SearchPanel
          hasWorkspace={Boolean(workspaceRoot)}
          onOpenHit={onSearchHit}
          onError={onError}
        />
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
              body="Provider keys and editor options open in the editor area."
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
