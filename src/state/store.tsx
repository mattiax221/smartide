import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { DemoFile } from "../lib/demoFiles";
import type {
  ActivityView,
  AiUiState,
  IdeState,
  OpenTab,
  SettingsUiState,
  Toast,
  ToastKind,
} from "./types";

type Action =
  | { type: "setActivity"; activity: ActivityView }
  | { type: "openFile"; file: DemoFile }
  | { type: "selectTab"; id: string; pane?: "primary" | "secondary" }
  | { type: "closeTab"; id: string }
  | { type: "togglePin"; id: string }
  | { type: "changeContent"; id: string; content: string }
  | { type: "setPanelCollapsed"; collapsed: boolean }
  | { type: "setPanelHeight"; height: number }
  | { type: "setPanelTab"; tab: IdeState["panelTab"] }
  | { type: "toggleChat" }
  | { type: "setChatOpen"; open: boolean }
  | { type: "setAiProvider"; providerId: string; modelId?: string }
  | { type: "setAiModel"; modelId: string }
  | { type: "toggleSplit" }
  | { type: "patchSettings"; patch: Partial<SettingsUiState> }
  | { type: "pushToast"; toast: Omit<Toast, "id" | "createdAt"> & { id?: string } }
  | { type: "dismissToast"; id: string }
  | { type: "setHostBanner"; message: string | null };

const initialState: IdeState = {
  activity: "explorer",
  workspace: {
    rootPath: null,
    rootLabel: "SMARTIDE",
  },
  tabs: [],
  activeTabId: null,
  secondaryTabId: null,
  splitEditor: false,
  panelCollapsed: false,
  panelHeight: 200,
  panelTab: "terminal",
  ai: {
    chatOpen: true,
    providerId: "ollama",
    modelId: "llama3.2",
  },
  settings: {
    editorFontSize: 13,
    minimap: true,
  },
  toasts: [],
  hostBanner: null,
};

function fileToTab(file: DemoFile): OpenTab {
  return {
    id: file.id,
    name: file.name,
    path: file.path,
    language: file.language,
    content: file.content,
    originalContent: file.content,
    pinned: false,
    dirty: false,
  };
}

function reducer(state: IdeState, action: Action): IdeState {
  switch (action.type) {
    case "setActivity":
      return { ...state, activity: action.activity };
    case "openFile": {
      if (action.file.kind !== "file") return state;
      const exists = state.tabs.some((t) => t.id === action.file.id);
      return {
        ...state,
        activity: "explorer",
        tabs: exists ? state.tabs : [...state.tabs, fileToTab(action.file)],
        activeTabId: action.file.id,
      };
    }
    case "selectTab":
      if (action.pane === "secondary") {
        return { ...state, secondaryTabId: action.id };
      }
      return { ...state, activeTabId: action.id };
    case "closeTab": {
      const tabs = state.tabs.filter((t) => t.id !== action.id);
      let activeTabId = state.activeTabId;
      let secondaryTabId = state.secondaryTabId;
      if (activeTabId === action.id) {
        activeTabId = tabs.length ? tabs[tabs.length - 1].id : null;
      }
      if (secondaryTabId === action.id) {
        secondaryTabId = tabs.find((t) => t.id !== activeTabId)?.id ?? null;
      }
      return { ...state, tabs, activeTabId, secondaryTabId };
    }
    case "togglePin":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.id ? { ...t, pinned: !t.pinned } : t,
        ),
      };
    case "changeContent":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.id
            ? {
                ...t,
                content: action.content,
                dirty: action.content !== t.originalContent,
              }
            : t,
        ),
      };
    case "setPanelCollapsed":
      return { ...state, panelCollapsed: action.collapsed };
    case "setPanelHeight":
      return {
        ...state,
        panelHeight: Math.min(420, Math.max(120, action.height)),
        panelCollapsed: false,
      };
    case "setPanelTab":
      return { ...state, panelTab: action.tab, panelCollapsed: false };
    case "toggleChat":
      return { ...state, ai: { ...state.ai, chatOpen: !state.ai.chatOpen } };
    case "setChatOpen":
      return { ...state, ai: { ...state.ai, chatOpen: action.open } };
    case "setAiProvider":
      return {
        ...state,
        ai: {
          ...state.ai,
          providerId: action.providerId,
          ...(action.modelId ? { modelId: action.modelId } : {}),
        },
      };
    case "setAiModel":
      return { ...state, ai: { ...state.ai, modelId: action.modelId } };
    case "toggleSplit": {
      const next = !state.splitEditor;
      let secondaryTabId = state.secondaryTabId;
      if (next && !secondaryTabId) {
        secondaryTabId =
          state.tabs.find((t) => t.id !== state.activeTabId)?.id ?? state.activeTabId;
      }
      return { ...state, splitEditor: next, secondaryTabId };
    }
    case "patchSettings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "pushToast": {
      const toast: Toast = {
        id: action.toast.id ?? crypto.randomUUID(),
        kind: action.toast.kind,
        title: action.toast.title,
        detail: action.toast.detail,
        createdAt: Date.now(),
      };
      return { ...state, toasts: [...state.toasts.slice(-4), toast] };
    }
    case "dismissToast":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    case "setHostBanner":
      return { ...state, hostBanner: action.message };
    default:
      return state;
  }
}

interface IdeStoreApi {
  state: IdeState;
  setActivity: (activity: ActivityView) => void;
  openFile: (file: DemoFile) => void;
  selectTab: (id: string, pane?: "primary" | "secondary") => void;
  closeTab: (id: string) => void;
  togglePin: (id: string) => void;
  changeContent: (id: string, content: string) => void;
  setPanelCollapsed: (collapsed: boolean) => void;
  setPanelHeight: (height: number) => void;
  setPanelTab: (tab: IdeState["panelTab"]) => void;
  toggleChat: () => void;
  setAiProvider: (providerId: string, modelId?: string) => void;
  setAiModel: (modelId: string) => void;
  toggleSplit: () => void;
  patchSettings: (patch: Partial<SettingsUiState>) => void;
  pushToast: (kind: ToastKind, title: string, detail?: string) => void;
  dismissToast: (id: string) => void;
  setHostBanner: (message: string | null) => void;
  notifyHostError: (err: unknown, fallback?: string) => void;
}

const IdeStoreContext = createContext<IdeStoreApi | null>(null);

export function IdeStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const pushToast = useCallback((kind: ToastKind, title: string, detail?: string) => {
    dispatch({ type: "pushToast", toast: { kind, title, detail } });
  }, []);

  const notifyHostError = useCallback(
    (err: unknown, fallback = "Host error") => {
      const detail = err instanceof Error ? err.message : String(err);
      dispatch({
        type: "pushToast",
        toast: { kind: "error", title: fallback, detail },
      });
      dispatch({ type: "setHostBanner", message: detail });
    },
    [],
  );

  const api = useMemo<IdeStoreApi>(
    () => ({
      state,
      setActivity: (activity) => dispatch({ type: "setActivity", activity }),
      openFile: (file) => dispatch({ type: "openFile", file }),
      selectTab: (id, pane) => dispatch({ type: "selectTab", id, pane }),
      closeTab: (id) => dispatch({ type: "closeTab", id }),
      togglePin: (id) => dispatch({ type: "togglePin", id }),
      changeContent: (id, content) => dispatch({ type: "changeContent", id, content }),
      setPanelCollapsed: (collapsed) => dispatch({ type: "setPanelCollapsed", collapsed }),
      setPanelHeight: (height) => dispatch({ type: "setPanelHeight", height }),
      setPanelTab: (tab) => dispatch({ type: "setPanelTab", tab }),
      toggleChat: () => dispatch({ type: "toggleChat" }),
      setAiProvider: (providerId, modelId) =>
        dispatch({ type: "setAiProvider", providerId, modelId }),
      setAiModel: (modelId) => dispatch({ type: "setAiModel", modelId }),
      toggleSplit: () => dispatch({ type: "toggleSplit" }),
      patchSettings: (patch) => dispatch({ type: "patchSettings", patch }),
      pushToast,
      dismissToast: (id) => dispatch({ type: "dismissToast", id }),
      setHostBanner: (message) => dispatch({ type: "setHostBanner", message }),
      notifyHostError,
    }),
    [state, pushToast, notifyHostError],
  );

  return <IdeStoreContext.Provider value={api}>{children}</IdeStoreContext.Provider>;
}

export function useIdeStore(): IdeStoreApi {
  const ctx = useContext(IdeStoreContext);
  if (!ctx) throw new Error("useIdeStore must be used within IdeStoreProvider");
  return ctx;
}

export type { AiUiState, IdeState, OpenTab };
