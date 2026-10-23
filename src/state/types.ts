import type { ActivityView } from "../components/layout/ActivityView";

export type { ActivityView };

export interface OpenTab {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  /** Content when the tab was opened / last saved (demo: open). */
  originalContent: string;
  pinned: boolean;
  dirty: boolean;
}

export interface WorkspaceState {
  /** null until real FS (Fase D); demo uses synthetic root label */
  rootPath: string | null;
  rootLabel: string;
}

export interface AiUiState {
  chatOpen: boolean;
  providerId: string;
  modelId: string;
}

export interface SettingsUiState {
  /** Reserved for future prefs; keys live in Rust vault */
  editorFontSize: number;
  minimap: boolean;
}

export type ToastKind = "info" | "success" | "error" | "warning";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  detail?: string;
  createdAt: number;
}

export interface IdeState {
  activity: ActivityView;
  workspace: WorkspaceState;
  tabs: OpenTab[];
  activeTabId: string | null;
  secondaryTabId: string | null;
  splitEditor: boolean;
  panelCollapsed: boolean;
  panelHeight: number;
  panelTab: "problems" | "output" | "terminal";
  ai: AiUiState;
  settings: SettingsUiState;
  toasts: Toast[];
  hostBanner: string | null;
}
