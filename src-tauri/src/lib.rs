mod ai;
mod secrets;
mod workspace;

use ai::{ChatRequest, ChatResponse, ProviderModels};
use secrets::ProviderInfo;
use std::path::PathBuf;
use tauri::Manager;
use tracing::{error, info, warn};
use workspace::{FsEntry, WorkspaceState};

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))
}

fn init_logging() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_target(true)
        .with_thread_ids(false)
        .try_init();
}

#[tauri::command]
fn list_ai_providers(app: tauri::AppHandle) -> Result<Vec<ProviderInfo>, String> {
    let dir = app_data_dir(&app)?;
    secrets::list_providers(&dir).map_err(|e| {
        error!(error = %e, "list_ai_providers failed");
        e.to_string()
    })
}

#[tauri::command]
fn set_api_key(app: tauri::AppHandle, provider_id: String, api_key: String) -> Result<(), String> {
    let dir = app_data_dir(&app)?;
    info!(provider = %provider_id, "set_api_key");
    secrets::set_api_key(&dir, &provider_id, &api_key).map_err(|e| {
        error!(provider = %provider_id, error = %e, "set_api_key failed");
        e.to_string()
    })
}

#[tauri::command]
fn get_api_key(app: tauri::AppHandle, provider_id: String) -> Result<Option<String>, String> {
    let dir = app_data_dir(&app)?;
    secrets::get_api_key(&dir, &provider_id).map_err(|e| {
        error!(provider = %provider_id, error = %e, "get_api_key failed");
        e.to_string()
    })
}

#[tauri::command]
fn delete_api_key(app: tauri::AppHandle, provider_id: String) -> Result<(), String> {
    let dir = app_data_dir(&app)?;
    info!(provider = %provider_id, "delete_api_key");
    secrets::delete_api_key(&dir, &provider_id).map_err(|e| {
        error!(provider = %provider_id, error = %e, "delete_api_key failed");
        e.to_string()
    })
}

#[tauri::command]
fn has_api_key(app: tauri::AppHandle, provider_id: String) -> Result<bool, String> {
    let dir = app_data_dir(&app)?;
    secrets::has_api_key(&dir, &provider_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_ai_models() -> Vec<ProviderModels> {
    ai::default_models()
}

#[tauri::command]
async fn ai_chat(app: tauri::AppHandle, request: ChatRequest) -> Result<ChatResponse, String> {
    let dir = app_data_dir(&app)?;
    info!(
        provider = %request.provider_id,
        model = %request.model,
        messages = request.messages.len(),
        "ai_chat"
    );
    match ai::chat(&dir, request).await {
        Ok(res) => {
            info!(
                provider = %res.provider_id,
                model = %res.model,
                chars = res.content.len(),
                "ai_chat ok"
            );
            Ok(res)
        }
        Err(e) => {
            warn!(error = %e, "ai_chat failed");
            Err(e)
        }
    }
}

#[tauri::command]
fn open_workspace(
    state: tauri::State<'_, WorkspaceState>,
    path: String,
) -> Result<Vec<FsEntry>, String> {
    let root = PathBuf::from(&path);
    workspace::set_root(&state, root.clone())?;
    info!(path = %path, "open_workspace");
    workspace::list_tree(&root).map_err(Into::into)
}

#[tauri::command]
fn list_workspace(state: tauri::State<'_, WorkspaceState>) -> Result<Vec<FsEntry>, String> {
    let root = workspace::get_root(&state)?
        .ok_or_else(|| "No workspace open".to_string())?;
    workspace::list_tree(&root).map_err(Into::into)
}

#[tauri::command]
fn read_workspace_file(
    state: tauri::State<'_, WorkspaceState>,
    path: String,
) -> Result<String, String> {
    workspace::read_text(&state, PathBuf::from(path).as_path()).map_err(Into::into)
}

#[tauri::command]
fn write_workspace_file(
    state: tauri::State<'_, WorkspaceState>,
    path: String,
    content: String,
) -> Result<(), String> {
    info!(path = %path, bytes = content.len(), "write_workspace_file");
    workspace::write_text(&state, PathBuf::from(path).as_path(), &content).map_err(Into::into)
}

#[tauri::command]
fn workspace_root(state: tauri::State<'_, WorkspaceState>) -> Result<Option<String>, String> {
    Ok(workspace::get_root(&state)?
        .map(|p| p.to_string_lossy().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_logging();
    info!("SmartIDE starting");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WorkspaceState::default())
        .invoke_handler(tauri::generate_handler![
            list_ai_providers,
            set_api_key,
            get_api_key,
            delete_api_key,
            has_api_key,
            list_ai_models,
            ai_chat,
            open_workspace,
            list_workspace,
            read_workspace_file,
            write_workspace_file,
            workspace_root
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
