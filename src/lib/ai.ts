import { invoke } from "@tauri-apps/api/core";
import { FALLBACK_PROVIDERS, type ProviderInfo } from "./apiKeys";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ContextFile {
  path: string;
  language: string;
  content: string;
}

export interface ChatRequest {
  providerId: string;
  model: string;
  messages: ChatMessage[];
  contextFile?: ContextFile | null;
}

export interface ChatResponse {
  content: string;
  provider_id: string;
  model: string;
}

export interface ModelInfo {
  id: string;
  label: string;
}

export interface ProviderModels {
  provider_id: string;
  models: ModelInfo[];
}

const FALLBACK_MODELS: ProviderModels[] = [
  {
    provider_id: "ollama",
    models: [
      { id: "llama3.2", label: "Llama 3.2" },
      { id: "qwen2.5-coder", label: "Qwen 2.5 Coder" },
    ],
  },
  {
    provider_id: "groq",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
    ],
  },
  {
    provider_id: "google",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
  {
    provider_id: "openrouter",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" },
      { id: "openrouter/auto", label: "Auto" },
    ],
  },
  {
    provider_id: "openai",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4o", label: "GPT-4o" },
    ],
  },
  {
    provider_id: "anthropic",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    ],
  },
];

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function listAiModels(): Promise<ProviderModels[]> {
  if (!isTauri()) return FALLBACK_MODELS;
  return invoke<ProviderModels[]>("list_ai_models");
}

export async function aiChat(request: ChatRequest): Promise<ChatResponse> {
  if (!isTauri()) {
    throw new Error("AI chat requires the Tauri desktop app (npm run tauri dev)");
  }
  return invoke<ChatResponse>("ai_chat", {
    request: {
      provider_id: request.providerId,
      model: request.model,
      messages: request.messages,
      context_file: request.contextFile ?? null,
    },
  });
}

/** Prefer providers that are ready (local or have a key). */
export function pickDefaultProvider(providers: ProviderInfo[]): string {
  const ready = providers.find((p) => !p.requires_key || p.has_key);
  return ready?.id ?? providers[0]?.id ?? "ollama";
}

export { FALLBACK_PROVIDERS };
