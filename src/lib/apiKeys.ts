import { invoke } from "@tauri-apps/api/core";

export type ProviderKind = "paid" | "free+paid" | "local";

export interface ProviderInfo {
  id: string;
  name: string;
  kind: ProviderKind | string;
  requires_key: boolean;
  has_key: boolean;
  docs_url: string | null;
}

/** Fallback list for browser-only `vite` preview (no Tauri runtime). */
export const FALLBACK_PROVIDERS: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    kind: "paid",
    requires_key: true,
    has_key: false,
    docs_url: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    kind: "paid",
    requires_key: true,
    has_key: false,
    docs_url: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "google",
    name: "Google Gemini",
    kind: "free+paid",
    requires_key: true,
    has_key: false,
    docs_url: "https://aistudio.google.com/apikey",
  },
  {
    id: "groq",
    name: "Groq",
    kind: "free+paid",
    requires_key: true,
    has_key: false,
    docs_url: "https://console.groq.com/keys",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "free+paid",
    requires_key: true,
    has_key: false,
    docs_url: "https://openrouter.ai/keys",
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    kind: "local",
    requires_key: false,
    has_key: false,
    docs_url: "https://ollama.com",
  },
];

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function listAiProviders(): Promise<ProviderInfo[]> {
  if (!isTauri()) return FALLBACK_PROVIDERS;
  return invoke<ProviderInfo[]>("list_ai_providers");
}

export async function setApiKey(providerId: string, apiKey: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("API key storage requires the Tauri desktop app");
  }
  await invoke("set_api_key", { providerId, apiKey });
}

export async function getApiKey(providerId: string): Promise<string | null> {
  if (!isTauri()) return null;
  return invoke<string | null>("get_api_key", { providerId });
}

export async function deleteApiKey(providerId: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("API key storage requires the Tauri desktop app");
  }
  await invoke("delete_api_key", { providerId });
}

export async function hasApiKey(providerId: string): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>("has_api_key", { providerId });
}
