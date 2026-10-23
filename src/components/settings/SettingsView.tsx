import { useEffect, useState } from "react";
import {
  deleteApiKey,
  getApiKey,
  listAiProviders,
  setApiKey,
  type ProviderInfo,
} from "../../lib/apiKeys";
import { useIdeStore } from "../../state/store";
import { Button, Input } from "../ui";

interface RowState {
  draft: string;
  reveal: boolean;
  saving: boolean;
  message: string | null;
  error: string | null;
}

export function SettingsView() {
  const { notifyHostError, pushToast } = useIdeStore();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listAiProviders();
      setProviders(list);
      setRows((prev) => {
        const next: Record<string, RowState> = {};
        for (const p of list) {
          next[p.id] = prev[p.id] ?? {
            draft: "",
            reveal: false,
            saving: false,
            message: null,
            error: null,
          };
        }
        return next;
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      notifyHostError(e, "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function patchRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  async function onSave(provider: ProviderInfo) {
    const row = rows[provider.id];
    if (!row) return;
    patchRow(provider.id, { saving: true, message: null, error: null });
    try {
      await setApiKey(provider.id, row.draft);
      patchRow(provider.id, {
        saving: false,
        draft: "",
        message: "Saved securely.",
      });
      pushToast("success", "API key saved", provider.name);
      await refresh();
    } catch (e) {
      patchRow(provider.id, {
        saving: false,
        error: e instanceof Error ? e.message : String(e),
      });
      notifyHostError(e, "Failed to save API key");
    }
  }

  async function onReveal(provider: ProviderInfo) {
    patchRow(provider.id, { error: null, message: null });
    try {
      const key = await getApiKey(provider.id);
      patchRow(provider.id, {
        draft: key ?? "",
        reveal: true,
        message: key ? "Loaded from secure storage." : "No key stored.",
      });
    } catch (e) {
      patchRow(provider.id, {
        error: e instanceof Error ? e.message : String(e),
      });
      notifyHostError(e, "Failed to reveal API key");
    }
  }

  async function onClear(provider: ProviderInfo) {
    patchRow(provider.id, { saving: true, message: null, error: null });
    try {
      await deleteApiKey(provider.id);
      patchRow(provider.id, {
        saving: false,
        draft: "",
        reveal: false,
        message: "Key removed.",
      });
      pushToast("info", "API key cleared", provider.name);
      await refresh();
    } catch (e) {
      patchRow(provider.id, {
        saving: false,
        error: e instanceof Error ? e.message : String(e),
      });
      notifyHostError(e, "Failed to clear API key");
    }
  }

  return (
    <div className="settings-view">
      <h1 className="settings-view__title">
        Set<span>tings</span>
      </h1>
      <p className="settings-view__subtitle">
        Configure API keys for AI coding providers. Keys are encrypted at rest (AES-256-GCM) with a
        master key in the OS credential store when available. Chat uses these keys from the host —
        they are not sent to the renderer except when you Reveal.
      </p>

      <section className="settings-section" aria-labelledby="ai-providers-heading">
        <h2 id="ai-providers-heading" className="settings-section__label">
          AI Providers
        </h2>

        {loading && <p className="settings-ok">Loading providers…</p>}
        {loadError && <p className="settings-error">{loadError}</p>}

        {!loading &&
          providers.map((provider) => {
            const row = rows[provider.id];
            return (
              <div key={provider.id} className="provider-row">
                <div className="provider-row__meta">
                  <h3>
                    {provider.name}
                    <span
                      className={`provider-badge${provider.kind === "local" ? " provider-badge--local" : ""}`}
                    >
                      {provider.kind}
                    </span>
                    {provider.has_key && (
                      <span className="provider-badge provider-badge--ok">key set</span>
                    )}
                  </h3>
                  <p>
                    {provider.requires_key
                      ? "API key required for cloud requests."
                      : "Runs locally — no API key needed."}
                    {provider.docs_url ? (
                      <>
                        {" "}
                        <a href={provider.docs_url} target="_blank" rel="noreferrer">
                          Get a key
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>

                {provider.requires_key && row && (
                  <div className="provider-row__actions">
                    <Input
                      type={row.reveal ? "text" : "password"}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={provider.has_key ? "••••••••••••" : "Paste API key"}
                      value={row.draft}
                      onChange={(e) =>
                        patchRow(provider.id, {
                          draft: e.target.value,
                          message: null,
                          error: null,
                        })
                      }
                    />
                    <div className="provider-row__buttons">
                      {provider.has_key && (
                        <>
                          <Button variant="ghost" onClick={() => void onReveal(provider)}>
                            Reveal
                          </Button>
                          <Button
                            variant="danger"
                            disabled={row.saving}
                            onClick={() => void onClear(provider)}
                          >
                            Clear
                          </Button>
                        </>
                      )}
                      <Button
                        variant="primary"
                        disabled={row.saving || !row.draft.trim()}
                        onClick={() => void onSave(provider)}
                      >
                        {row.saving ? "Saving…" : "Save"}
                      </Button>
                    </div>
                    {row.error && <p className="settings-error">{row.error}</p>}
                    {row.message && <p className="settings-ok">{row.message}</p>}
                  </div>
                )}
              </div>
            );
          })}
      </section>

      <p className="settings-note">
        Chat completions are wired for Ollama (local), Groq, Gemini, OpenRouter, OpenAI, and
        Anthropic via <code>ai_chat</code>. Open the spark icon in the activity bar to chat; the
        open editor file is attached as context when present.
      </p>
    </div>
  );
}
