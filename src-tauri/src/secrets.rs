//! Secure local storage for AI provider API keys.
//!
//! Keys are encrypted with AES-256-GCM. The master key lives in the OS
//! credential store via `keyring`, with a file-backed fallback for
//! environments where the OS keychain is unavailable (e.g. some CI/headless).

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use keyring::Entry;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;
use zeroize::Zeroize;

const SERVICE: &str = "com.smartide.desktop";
const MASTER_KEY_USER: &str = "secrets-master-key";
const STORE_FILE: &str = "api-keys.enc";
const FALLBACK_KEY_FILE: &str = ".master-key";

#[derive(Debug, Error)]
pub enum SecretsError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("crypto: {0}")]
    Crypto(String),
    #[error("serialize: {0}")]
    Serialize(#[from] serde_json::Error),
    #[error("keyring: {0}")]
    Keyring(String),
    #[error("provider not found: {0}")]
    NotFound(String),
}

impl From<SecretsError> for String {
    fn from(value: SecretsError) -> Self {
        value.to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub requires_key: bool,
    pub has_key: bool,
    pub docs_url: Option<String>,
}

#[derive(Default, Serialize, Deserialize)]
struct KeyStore {
    /// provider_id -> api key (plaintext only while in memory)
    keys: HashMap<String, String>,
}

fn known_providers() -> Vec<ProviderInfo> {
    vec![
        ProviderInfo {
            id: "openai".into(),
            name: "OpenAI".into(),
            kind: "paid".into(),
            requires_key: true,
            has_key: false,
            docs_url: Some("https://platform.openai.com/api-keys".into()),
        },
        ProviderInfo {
            id: "anthropic".into(),
            name: "Anthropic".into(),
            kind: "paid".into(),
            requires_key: true,
            has_key: false,
            docs_url: Some("https://console.anthropic.com/settings/keys".into()),
        },
        ProviderInfo {
            id: "google".into(),
            name: "Google Gemini".into(),
            kind: "free+paid".into(),
            requires_key: true,
            has_key: false,
            docs_url: Some("https://aistudio.google.com/apikey".into()),
        },
        ProviderInfo {
            id: "groq".into(),
            name: "Groq".into(),
            kind: "free+paid".into(),
            requires_key: true,
            has_key: false,
            docs_url: Some("https://console.groq.com/keys".into()),
        },
        ProviderInfo {
            id: "openrouter".into(),
            name: "OpenRouter".into(),
            kind: "free+paid".into(),
            requires_key: true,
            has_key: false,
            docs_url: Some("https://openrouter.ai/keys".into()),
        },
        ProviderInfo {
            id: "ollama".into(),
            name: "Ollama (local)".into(),
            kind: "local".into(),
            requires_key: false,
            has_key: false,
            docs_url: Some("https://ollama.com".into()),
        },
    ]
}

fn data_dir(app_data: &Path) -> PathBuf {
    app_data.join("secrets")
}

fn ensure_data_dir(app_data: &Path) -> Result<PathBuf, SecretsError> {
    let dir = data_dir(app_data);
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn load_or_create_master_key(app_data: &Path) -> Result<[u8; 32], SecretsError> {
    let entry = Entry::new(SERVICE, MASTER_KEY_USER)
        .map_err(|e| SecretsError::Keyring(e.to_string()))?;

    match entry.get_password() {
        Ok(encoded) => {
            let bytes = B64
                .decode(encoded.trim())
                .map_err(|e| SecretsError::Crypto(e.to_string()))?;
            if bytes.len() != 32 {
                return Err(SecretsError::Crypto("invalid master key length".into()));
            }
            let mut key = [0u8; 32];
            key.copy_from_slice(&bytes);
            Ok(key)
        }
        Err(_) => {
            // Try file fallback (headless / CI)
            let dir = ensure_data_dir(app_data)?;
            let fallback = dir.join(FALLBACK_KEY_FILE);
            if fallback.exists() {
                let encoded = fs::read_to_string(&fallback)?;
                let bytes = B64
                    .decode(encoded.trim())
                    .map_err(|e| SecretsError::Crypto(e.to_string()))?;
                if bytes.len() != 32 {
                    return Err(SecretsError::Crypto("invalid fallback key length".into()));
                }
                let mut key = [0u8; 32];
                key.copy_from_slice(&bytes);
                return Ok(key);
            }

            let mut key = [0u8; 32];
            rand::thread_rng().fill_bytes(&mut key);
            let encoded = B64.encode(key);

            if let Err(e) = entry.set_password(&encoded) {
                // Persist fallback so we can still encrypt locally
                fs::write(&fallback, &encoded)?;
                let _ = e; // keyring unavailable — fallback used
            }
            Ok(key)
        }
    }
}

fn encrypt(master: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, SecretsError> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(master));
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let mut ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| SecretsError::Crypto(e.to_string()))?;
    let mut out = nonce_bytes.to_vec();
    out.append(&mut ciphertext);
    Ok(out)
}

fn decrypt(master: &[u8; 32], blob: &[u8]) -> Result<Vec<u8>, SecretsError> {
    if blob.len() < 13 {
        return Err(SecretsError::Crypto("ciphertext too short".into()));
    }
    let (nonce_bytes, ciphertext) = blob.split_at(12);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(master));
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| SecretsError::Crypto(e.to_string()))
}

fn store_path(app_data: &Path) -> PathBuf {
    data_dir(app_data).join(STORE_FILE)
}

fn load_store(app_data: &Path) -> Result<KeyStore, SecretsError> {
    let path = store_path(app_data);
    if !path.exists() {
        return Ok(KeyStore::default());
    }
    let mut master = load_or_create_master_key(app_data)?;
    let blob = fs::read(&path)?;
    let plain = decrypt(&master, &blob)?;
    master.zeroize();
    let store: KeyStore = serde_json::from_slice(&plain)?;
    Ok(store)
}

fn save_store(app_data: &Path, store: &KeyStore) -> Result<(), SecretsError> {
    ensure_data_dir(app_data)?;
    let mut master = load_or_create_master_key(app_data)?;
    let mut plain = serde_json::to_vec(store)?;
    let blob = encrypt(&master, &plain)?;
    plain.zeroize();
    master.zeroize();
    fs::write(store_path(app_data), blob)?;
    Ok(())
}

pub fn list_providers(app_data: &Path) -> Result<Vec<ProviderInfo>, SecretsError> {
    let store = load_store(app_data)?;
    let mut providers = known_providers();
    for p in &mut providers {
        p.has_key = store.keys.contains_key(&p.id);
    }
    Ok(providers)
}

pub fn set_api_key(app_data: &Path, provider_id: &str, api_key: &str) -> Result<(), SecretsError> {
    let known = known_providers();
    if !known.iter().any(|p| p.id == provider_id) {
        return Err(SecretsError::NotFound(provider_id.to_string()));
    }
    let trimmed = api_key.trim();
    if trimmed.is_empty() {
        return delete_api_key(app_data, provider_id);
    }
    let mut store = load_store(app_data)?;
    store.keys.insert(provider_id.to_string(), trimmed.to_string());
    save_store(app_data, &store)
}

pub fn get_api_key(app_data: &Path, provider_id: &str) -> Result<Option<String>, SecretsError> {
    let store = load_store(app_data)?;
    Ok(store.keys.get(provider_id).cloned())
}

pub fn delete_api_key(app_data: &Path, provider_id: &str) -> Result<(), SecretsError> {
    let mut store = load_store(app_data)?;
    store.keys.remove(provider_id);
    save_store(app_data, &store)
}

pub fn has_api_key(app_data: &Path, provider_id: &str) -> Result<bool, SecretsError> {
    let store = load_store(app_data)?;
    Ok(store.keys.contains_key(provider_id))
}
