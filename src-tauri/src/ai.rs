//! Multi-provider chat completions. Keys stay in Rust (loaded from secrets).

use crate::secrets;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::Path;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub provider_id: String,
    pub model: String,
    pub messages: Vec<ChatMessage>,
    /// Optional open-file context appended as a system note.
    pub context_file: Option<ContextFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextFile {
    pub path: String,
    pub language: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub provider_id: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderModels {
    pub provider_id: String,
    pub models: Vec<ModelInfo>,
}

pub fn default_models() -> Vec<ProviderModels> {
    vec![
        ProviderModels {
            provider_id: "ollama".into(),
            models: vec![
                ModelInfo {
                    id: "llama3.2".into(),
                    label: "Llama 3.2".into(),
                },
                ModelInfo {
                    id: "qwen2.5-coder".into(),
                    label: "Qwen 2.5 Coder".into(),
                },
                ModelInfo {
                    id: "codellama".into(),
                    label: "Code Llama".into(),
                },
            ],
        },
        ProviderModels {
            provider_id: "groq".into(),
            models: vec![
                ModelInfo {
                    id: "llama-3.3-70b-versatile".into(),
                    label: "Llama 3.3 70B".into(),
                },
                ModelInfo {
                    id: "llama-3.1-8b-instant".into(),
                    label: "Llama 3.1 8B Instant".into(),
                },
                ModelInfo {
                    id: "mixtral-8x7b-32768".into(),
                    label: "Mixtral 8x7B".into(),
                },
            ],
        },
        ProviderModels {
            provider_id: "google".into(),
            models: vec![
                ModelInfo {
                    id: "gemini-2.0-flash".into(),
                    label: "Gemini 2.0 Flash".into(),
                },
                ModelInfo {
                    id: "gemini-1.5-flash".into(),
                    label: "Gemini 1.5 Flash".into(),
                },
                ModelInfo {
                    id: "gemini-1.5-pro".into(),
                    label: "Gemini 1.5 Pro".into(),
                },
            ],
        },
        ProviderModels {
            provider_id: "openrouter".into(),
            models: vec![
                ModelInfo {
                    id: "openrouter/auto".into(),
                    label: "Auto".into(),
                },
                ModelInfo {
                    id: "meta-llama/llama-3.3-70b-instruct:free".into(),
                    label: "Llama 3.3 70B (free)".into(),
                },
                ModelInfo {
                    id: "google/gemini-2.0-flash-exp:free".into(),
                    label: "Gemini 2.0 Flash (free)".into(),
                },
                ModelInfo {
                    id: "anthropic/claude-sonnet-4".into(),
                    label: "Claude Sonnet 4".into(),
                },
            ],
        },
        ProviderModels {
            provider_id: "openai".into(),
            models: vec![
                ModelInfo {
                    id: "gpt-4o-mini".into(),
                    label: "GPT-4o mini".into(),
                },
                ModelInfo {
                    id: "gpt-4o".into(),
                    label: "GPT-4o".into(),
                },
                ModelInfo {
                    id: "o3-mini".into(),
                    label: "o3-mini".into(),
                },
            ],
        },
        ProviderModels {
            provider_id: "anthropic".into(),
            models: vec![
                ModelInfo {
                    id: "claude-sonnet-4-20250514".into(),
                    label: "Claude Sonnet 4".into(),
                },
                ModelInfo {
                    id: "claude-3-5-haiku-20241022".into(),
                    label: "Claude 3.5 Haiku".into(),
                },
            ],
        },
    ]
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(90))
        .build()
        .map_err(|e| e.to_string())
}

fn with_context(messages: &[ChatMessage], ctx: &Option<ContextFile>) -> Vec<ChatMessage> {
    let mut out = Vec::with_capacity(messages.len() + 1);
    let mut system = String::from(
        "You are SmartIDE's coding assistant. Be concise and practical. Prefer code blocks with language tags when showing code.",
    );
    if let Some(file) = ctx {
        let truncated: String = file.content.chars().take(12_000).collect();
        system.push_str(&format!(
            "\n\nThe user has this file open (`{}`, language: {}):\n```\n{}\n```",
            file.path, file.language, truncated
        ));
    }
    out.push(ChatMessage {
        role: "system".into(),
        content: system,
    });
    for m in messages {
        if m.role == "system" {
            continue;
        }
        out.push(m.clone());
    }
    out
}

fn require_key(app_data: &Path, provider: &str) -> Result<String, String> {
    match secrets::get_api_key(app_data, provider).map_err(|e| e.to_string())? {
        Some(k) if !k.trim().is_empty() => Ok(k),
        _ => Err(format!(
            "No API key for `{provider}`. Add one in Settings."
        )),
    }
}

async fn openai_compatible(
    url: &str,
    api_key: Option<&str>,
    model: &str,
    messages: &[ChatMessage],
    extra_headers: &[(&str, &str)],
) -> Result<String, String> {
    let client = http_client()?;
    let body = json!({
        "model": model,
        "messages": messages,
        "temperature": 0.3,
    });
    let mut req = client.post(url).json(&body);
    if let Some(key) = api_key {
        req = req.bearer_auth(key);
    }
    for (k, v) in extra_headers {
        req = req.header(*k, *v);
    }
    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {status}: {text}"));
    }
    let v: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    v["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Unexpected response: {text}"))
}

async fn anthropic_chat(
    api_key: &str,
    model: &str,
    messages: &[ChatMessage],
) -> Result<String, String> {
    let client = http_client()?;
    let mut system = String::new();
    let mut anth_msgs: Vec<Value> = Vec::new();
    for m in messages {
        match m.role.as_str() {
            "system" => {
                if !system.is_empty() {
                    system.push('\n');
                }
                system.push_str(&m.content);
            }
            "assistant" | "user" => {
                anth_msgs.push(json!({
                    "role": m.role,
                    "content": m.content,
                }));
            }
            _ => {}
        }
    }
    let mut body = json!({
        "model": model,
        "max_tokens": 4096,
        "messages": anth_msgs,
    });
    if !system.is_empty() {
        body["system"] = json!(system);
    }
    let res = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {status}: {text}"));
    }
    let v: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    // content is an array of blocks
    if let Some(arr) = v["content"].as_array() {
        let mut out = String::new();
        for block in arr {
            if block["type"] == "text" {
                if let Some(t) = block["text"].as_str() {
                    out.push_str(t);
                }
            }
        }
        if !out.is_empty() {
            return Ok(out);
        }
    }
    Err(format!("Unexpected Anthropic response: {text}"))
}

async fn gemini_chat(
    api_key: &str,
    model: &str,
    messages: &[ChatMessage],
) -> Result<String, String> {
    let client = http_client()?;
    let mut system = String::new();
    let mut contents: Vec<Value> = Vec::new();
    for m in messages {
        match m.role.as_str() {
            "system" => {
                if !system.is_empty() {
                    system.push('\n');
                }
                system.push_str(&m.content);
            }
            "assistant" => contents.push(json!({
                "role": "model",
                "parts": [{"text": m.content}],
            })),
            "user" => contents.push(json!({
                "role": "user",
                "parts": [{"text": m.content}],
            })),
            _ => {}
        }
    }
    let mut body = json!({ "contents": contents });
    if !system.is_empty() {
        body["systemInstruction"] = json!({
            "parts": [{"text": system}]
        });
    }
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    );
    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {status}: {text}"));
    }
    let v: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    v["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Unexpected Gemini response: {text}"))
}

async fn ollama_chat(model: &str, messages: &[ChatMessage]) -> Result<String, String> {
    // Prefer OpenAI-compatible endpoint; fall back to native /api/chat
    match openai_compatible(
        "http://127.0.0.1:11434/v1/chat/completions",
        Some("ollama"),
        model,
        messages,
        &[],
    )
    .await
    {
        Ok(s) => Ok(s),
        Err(_) => {
            let client = http_client()?;
            let body = json!({
                "model": model,
                "messages": messages,
                "stream": false,
            });
            let res = client
                .post("http://127.0.0.1:11434/api/chat")
                .json(&body)
                .send()
                .await
                .map_err(|e| {
                    format!("Ollama unreachable at 127.0.0.1:11434 ({e}). Is Ollama running?")
                })?;
            let status = res.status();
            let text = res.text().await.map_err(|e| e.to_string())?;
            if !status.is_success() {
                return Err(format!("HTTP {status}: {text}"));
            }
            let v: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
            v["message"]["content"]
                .as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| format!("Unexpected Ollama response: {text}"))
        }
    }
}

pub async fn chat(app_data: &Path, req: ChatRequest) -> Result<ChatResponse, String> {
    let messages = with_context(&req.messages, &req.context_file);
    let provider = req.provider_id.as_str();
    let model = req.model.as_str();

    let content = match provider {
        "ollama" => ollama_chat(model, &messages).await?,
        "openai" => {
            let key = require_key(app_data, "openai")?;
            openai_compatible(
                "https://api.openai.com/v1/chat/completions",
                Some(&key),
                model,
                &messages,
                &[],
            )
            .await?
        }
        "groq" => {
            let key = require_key(app_data, "groq")?;
            openai_compatible(
                "https://api.groq.com/openai/v1/chat/completions",
                Some(&key),
                model,
                &messages,
                &[],
            )
            .await?
        }
        "openrouter" => {
            let key = require_key(app_data, "openrouter")?;
            openai_compatible(
                "https://openrouter.ai/api/v1/chat/completions",
                Some(&key),
                model,
                &messages,
                &[
                    ("HTTP-Referer", "https://github.com/mattiax221/smartide"),
                    ("X-Title", "SmartIDE"),
                ],
            )
            .await?
        }
        "anthropic" => {
            let key = require_key(app_data, "anthropic")?;
            anthropic_chat(&key, model, &messages).await?
        }
        "google" => {
            let key = require_key(app_data, "google")?;
            gemini_chat(&key, model, &messages).await?
        }
        other => return Err(format!("Unknown provider: {other}")),
    };

    Ok(ChatResponse {
        content,
        provider_id: req.provider_id,
        model: req.model,
    })
}
