import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export async function terminalCreate(cols: number, rows: number): Promise<string> {
  return invoke<string>("terminal_create", { cols, rows });
}

export async function terminalWrite(id: string, data: string): Promise<void> {
  await invoke("terminal_write", { id, data });
}

export async function terminalResize(id: string, cols: number, rows: number): Promise<void> {
  await invoke("terminal_resize", { id, cols, rows });
}

export async function terminalKill(id: string): Promise<void> {
  await invoke("terminal_kill", { id });
}

export async function onTerminalData(
  handler: (payload: { id: string; data: string }) => void,
): Promise<UnlistenFn> {
  return listen<{ id: string; data: string }>("terminal-data", (e) => handler(e.payload));
}
