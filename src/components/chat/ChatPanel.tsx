import { useEffect, useMemo, useRef, useState } from "react";
import {
  aiChat,
  listAiModels,
  pickDefaultProvider,
  type ChatMessage,
  type ContextFile,
  type ProviderModels,
} from "../../lib/ai";
import { listAiProviders, type ProviderInfo } from "../../lib/apiKeys";

interface ChatPanelProps {
  open: boolean;
  contextFile: ContextFile | null;
}

interface UiMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
}

export function ChatPanel({ open, contextFile }: ChatPanelProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ProviderModels[]>([]);
  const [providerId, setProviderId] = useState("ollama");
  const [modelId, setModelId] = useState("llama3.2");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [p, m] = await Promise.all([listAiProviders(), listAiModels()]);
        setProviders(p);
        setModels(m);
        const def = pickDefaultProvider(p);
        setProviderId(def);
        const first = m.find((x) => x.provider_id === def)?.models[0];
        if (first) setModelId(first.id);
      } catch {
        /* browser preview */
      }
    })();
  }, []);

  const providerModels = useMemo(
    () => models.find((m) => m.provider_id === providerId)?.models ?? [],
    [models, providerId],
  );

  useEffect(() => {
    if (!providerModels.some((m) => m.id === modelId) && providerModels[0]) {
      setModelId(providerModels[0].id);
    }
  }, [providerModels, modelId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: UiMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    const history: ChatMessage[] = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const res = await aiChat({
        providerId,
        model: modelId,
        messages: history,
        contextFile,
      });
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: res.content },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "error",
          content: e instanceof Error ? e.message : String(e),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <aside className="chat-panel" aria-label="AI Chat">
      <div className="chat-panel__header">
        <h2 className="chat-panel__title">AI Chat</h2>
        <div className="chat-panel__controls">
          <select
            className="chat-select"
            value={providerId}
            aria-label="Provider"
            onChange={(e) => setProviderId(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.requires_key && !p.has_key ? " (key needed)" : ""}
              </option>
            ))}
          </select>
          <select
            className="chat-select"
            value={modelId}
            aria-label="Model"
            onChange={(e) => setModelId(e.target.value)}
          >
            {providerModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="chat-empty">
            Ask about the open file or anything coding-related. Keys stay encrypted on the host;
            Ollama needs no key.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-bubble chat-bubble--${m.role === "error" ? "error" : m.role}`}
          >
            <span className="chat-bubble__role">
              {m.role === "user" ? "You" : m.role === "error" ? "Error" : "Assistant"}
            </span>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="chat-bubble chat-bubble--assistant">
            <span className="chat-bubble__role">Assistant</span>
            Thinking…
          </div>
        )}
      </div>

      <div className="chat-composer">
        <textarea
          className="chat-input"
          placeholder="Ask SmartIDE…"
          value={input}
          rows={3}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div className="chat-composer__row">
          <span className="chat-composer__hint">
            {contextFile
              ? `Context: ${contextFile.path}`
              : "No file open — chat without file context"}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !input.trim()}
            onClick={() => void send()}
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
      </div>
    </aside>
  );
}
