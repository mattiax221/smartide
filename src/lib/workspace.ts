import { invoke } from "@tauri-apps/api/core";

export interface FsEntry {
  id: string;
  name: string;
  path: string;
  kind: "file" | "folder" | string;
  parent: string | null;
  language: string;
}

export interface SearchHit {
  path: string;
  line: number;
  column: number;
  preview: string;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  return invoke<string | null>("pick_workspace_folder");
}

export async function openWorkspace(path: string): Promise<FsEntry[]> {
  return invoke<FsEntry[]>("open_workspace", { path });
}

export async function listWorkspace(): Promise<FsEntry[]> {
  return invoke<FsEntry[]>("list_workspace");
}

export async function readWorkspaceFile(path: string): Promise<string> {
  return invoke<string>("read_workspace_file", { path });
}

export async function writeWorkspaceFile(path: string, content: string): Promise<void> {
  await invoke("write_workspace_file", { path, content });
}

export async function createWorkspaceFile(path: string, content = ""): Promise<void> {
  await invoke("create_workspace_file", { path, content });
}

export async function createWorkspaceDir(path: string): Promise<void> {
  await invoke("create_workspace_dir", { path });
}

export async function renameWorkspacePath(from: string, to: string): Promise<void> {
  await invoke("rename_workspace_path", { from, to });
}

export async function deleteWorkspacePath(path: string): Promise<void> {
  await invoke("delete_workspace_path", { path });
}

export async function revealInOs(path: string): Promise<void> {
  await invoke("reveal_in_os", { path });
}

export async function searchWorkspace(
  query: string,
  opts: { caseSensitive?: boolean; useRegex?: boolean; glob?: string } = {},
): Promise<SearchHit[]> {
  return invoke<SearchHit[]>("search_workspace", {
    query,
    caseSensitive: opts.caseSensitive ?? false,
    useRegex: opts.useRegex ?? false,
    glob: opts.glob ?? "**/*",
  });
}

export function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

export function joinPath(parent: string, name: string): string {
  if (!parent) return name;
  const sep = parent.includes("\\") ? "\\" : "/";
  return parent.endsWith("/") || parent.endsWith("\\") ? parent + name : parent + sep + name;
}

export function dirname(path: string): string {
  const norm = path.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  return i <= 0 ? path : path.slice(0, i);
}

const RECENT_KEY = "smartide.recentWorkspaces";

export function loadRecentWorkspaces(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecentWorkspace(path: string): string[] {
  const next = [path, ...loadRecentWorkspaces().filter((p) => p !== path)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

/** Simple fuzzy score: subsequence match, higher is better. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 100 - t.indexOf(q);
  let qi = 0;
  let score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 1;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}
