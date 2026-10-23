import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export interface FsEntry {
  id: string;
  name: string;
  path: string;
  kind: "file" | "folder" | string;
  parent: string | null;
  language: string;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  const selected = await open({ directory: true, multiple: false });
  if (!selected || Array.isArray(selected)) return null;
  return selected;
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

export function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
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
