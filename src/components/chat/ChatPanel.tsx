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
import { useIdeStore } from "../../state/store";
import { Button, EmptyState, Select } from "../ui";

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
  const { state, setAiProvider, setAiModel, notifyHostError, pushToast } = useIdeStore();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ProviderModels[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const providerId = state.ai.providerId;
  const modelId = state.ai.modelId;

  useEffect(() => {
    void (async () => {
      try {
        const [p, m] = await Promise.all([listAiProviders(), listAiModels()]);
        setProviders(p);
        setModels(m);
        const def = pickDefaultProvider(p);
        const first = m.find((x) => x.provider_id === def)?.models[0];
        setAiProvider(def, first?.id);
      } catch (e) {
        notifyHostError(e, "Failed to load AI providers");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  const providerModels = useMemo(
    () => models.find((m) => m.provider_id === providerId)?.models ?? [],
    [models, providerId],
  );

  useEffect(() => {
    if (!providerModels.some((m) => m.id === modelId) && providerModels[0]) {
      setAiModel(providerModels[0].id);
    }
  }, [providerModels, modelId, setAiModel]);

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
      const detail = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "error", content: detail },
      ]);
      notifyHostError(e, "AI request failed");
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
          <Select
            value={providerId}
            aria-label="Provider"
            onChange={(e) => {
              const id = e.target.value;
              const first = models.find((x) => x.provider_id === id)?.models[0];
              setAiProvider(id, first?.id);
            }}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.requires_key && !p.has_key ? " (key needed)" : ""}
              </option>
            ))}
          </Select>
          <Select
            value={modelId}
            aria-label="Model"
            onChange={(e) => setAiModel(e.target.value)}
          >
            {providerModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && !busy && (
          <EmptyState
            title="Start a coding chat"
            body="Uses encrypted host keys. Ollama needs no key. Open-file context attaches automatically."
            actionLabel="Clear tip"
            onAction={() => pushToast("info", "Tip", "Enter sends · Shift+Enter newline")}
            icon="✦"
          />
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
            <div className="chat-skeleton" aria-label="Thinking">
              <div className="chat-skeleton__line" />
              <div className="chat-skeleton__line" />
              <div className="chat-skeleton__line" />
            </div>
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
          <Button variant="primary" disabled={busy || !input.trim()} onClick={() => void send()}>
            {busy ? "…" : "Send"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
