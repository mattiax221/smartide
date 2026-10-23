import type { ActivityView } from "../components/layout/ActivityView";
import type { FsEntry } from "../lib/workspace";

export type { ActivityView };

export interface OpenTab {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  originalContent: string;
  pinned: boolean;
  dirty: boolean;
  /** true when backed by real FS path */
  real: boolean;
}

export interface WorkspaceState {
  rootPath: string | null;
  rootLabel: string;
  entries: FsEntry[];
  recent: string[];
}

export interface AiUiState {
  chatOpen: boolean;
  providerId: string;
  modelId: string;
}

export interface SettingsUiState {
  editorFontSize: number;
  minimap: boolean;
  wordWrap: boolean;
  tabSize: number;
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
  helpOpen: boolean;
}
