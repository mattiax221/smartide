mod secrets;

use secrets::ProviderInfo;
use std::path::PathBuf;
use tauri::Manager;

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))
}

#[tauri::command]
fn list_ai_providers(app: tauri::AppHandle) -> Result<Vec<ProviderInfo>, String> {
    let dir = app_data_dir(&app)?;
    secrets::list_providers(&dir).map_err(Into::into)
}

#[tauri::command]
fn set_api_key(app: tauri::AppHandle, provider_id: String, api_key: String) -> Result<(), String> {
    let dir = app_data_dir(&app)?;
    secrets::set_api_key(&dir, &provider_id, &api_key).map_err(Into::into)
}

/// Returns the stored key only when explicitly requested (settings reveal).
/// Prefer `has_api_key` / provider list flags for normal UI.
#[tauri::command]
fn get_api_key(app: tauri::AppHandle, provider_id: String) -> Result<Option<String>, String> {
    let dir = app_data_dir(&app)?;
    secrets::get_api_key(&dir, &provider_id).map_err(Into::into)
}

#[tauri::command]
fn delete_api_key(app: tauri::AppHandle, provider_id: String) -> Result<(), String> {
    let dir = app_data_dir(&app)?;
    secrets::delete_api_key(&dir, &provider_id).map_err(Into::into)
}

#[tauri::command]
fn has_api_key(app: tauri::AppHandle, provider_id: String) -> Result<bool, String> {
    let dir = app_data_dir(&app)?;
    secrets::has_api_key(&dir, &provider_id).map_err(Into::into)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_ai_providers,
            set_api_key,
            get_api_key,
            delete_api_key,
            has_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
