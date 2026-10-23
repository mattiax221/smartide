mod ai;
mod secrets;
mod terminal;
mod workspace;

use ai::{ChatRequest, ChatResponse, ProviderModels};
use secrets::ProviderInfo;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tracing::{error, info, warn};
use workspace::{FsEntry, SearchHit, WorkspaceState};

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};

struct WatchState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    last_emit: Mutex<Instant>,
}

impl Default for WatchState {
    fn default() -> Self {
        Self {
            watcher: Mutex::new(None),
            last_emit: Mutex::new(Instant::now() - Duration::from_secs(10)),
        }
    }
}

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
async fn pick_workspace_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let result = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .blocking_pick_folder()
            .and_then(|p| p.into_path().ok())
            .map(|p| p.to_string_lossy().into_owned())
    })
    .await
    .map_err(|e| format!("dialog task: {e}"))?;
    Ok(result)
}

#[tauri::command]
fn open_workspace(
    app: tauri::AppHandle,
    state: State<'_, WorkspaceState>,
    watch: State<'_, WatchState>,
    path: String,
) -> Result<Vec<FsEntry>, String> {
    let root = PathBuf::from(&path);
    workspace::set_root(&state, root.clone())?;
    info!(path = %path, "open_workspace");
    start_watch_inner(&app, &watch, &root)?;
    workspace::list_tree(&root).map_err(Into::into)
}

fn start_watch_inner(
    app: &tauri::AppHandle,
    watch: &WatchState,
    root: &PathBuf,
) -> Result<(), String> {
    let app2 = app.clone();
    let last = std::sync::Arc::new(Mutex::new(Instant::now() - Duration::from_secs(10)));
    let last2 = last.clone();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            if res.is_err() {
                return;
            }
            let mut slot = match last2.lock() {
                Ok(s) => s,
                Err(_) => return,
            };
            if slot.elapsed() < Duration::from_millis(400) {
                return;
            }
            *slot = Instant::now();
            let _ = app2.emit("workspace-changed", ());
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;
    watcher
        .watch(root, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;
    *watch.watcher.lock().map_err(|e| e.to_string())? = Some(watcher);
    *watch.last_emit.lock().map_err(|e| e.to_string())? = Instant::now();
    let _ = last;
    Ok(())
}

#[tauri::command]
fn list_workspace(state: State<'_, WorkspaceState>) -> Result<Vec<FsEntry>, String> {
    let root = workspace::get_root(&state)?.ok_or_else(|| "No workspace open".to_string())?;
    workspace::list_tree(&root).map_err(Into::into)
}

#[tauri::command]
fn read_workspace_file(
    state: State<'_, WorkspaceState>,
    path: String,
) -> Result<String, String> {
    workspace::read_text(&state, PathBuf::from(path).as_path()).map_err(Into::into)
}

#[tauri::command]
fn write_workspace_file(
    state: State<'_, WorkspaceState>,
    path: String,
    content: String,
) -> Result<(), String> {
    info!(path = %path, bytes = content.len(), "write_workspace_file");
    workspace::write_text(&state, PathBuf::from(path).as_path(), &content).map_err(Into::into)
}

#[tauri::command]
fn workspace_root(state: State<'_, WorkspaceState>) -> Result<Option<String>, String> {
    Ok(workspace::get_root(&state)?.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn create_workspace_file(
    state: State<'_, WorkspaceState>,
    path: String,
    content: Option<String>,
) -> Result<(), String> {
    workspace::create_file(
        &state,
        PathBuf::from(path).as_path(),
        content.as_deref().unwrap_or(""),
    )
    .map_err(Into::into)
}

#[tauri::command]
fn create_workspace_dir(state: State<'_, WorkspaceState>, path: String) -> Result<(), String> {
    workspace::create_dir(&state, PathBuf::from(path).as_path()).map_err(Into::into)
}

#[tauri::command]
fn rename_workspace_path(
    state: State<'_, WorkspaceState>,
    from: String,
    to: String,
) -> Result<(), String> {
    workspace::rename_path(
        &state,
        PathBuf::from(from).as_path(),
        PathBuf::from(to).as_path(),
    )
    .map_err(Into::into)
}

#[tauri::command]
fn delete_workspace_path(state: State<'_, WorkspaceState>, path: String) -> Result<(), String> {
    workspace::delete_path(&state, PathBuf::from(path).as_path()).map_err(Into::into)
}

#[tauri::command]
fn reveal_in_os(path: String) -> Result<(), String> {
    workspace::reveal_in_os(PathBuf::from(path).as_path()).map_err(Into::into)
}

#[tauri::command]
fn search_workspace(
    state: State<'_, WorkspaceState>,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
    glob: String,
) -> Result<Vec<SearchHit>, String> {
    workspace::search_in_files(&state, &query, case_sensitive, use_regex, &glob)
        .map_err(Into::into)
}

#[tauri::command]
fn terminal_create(
    app: tauri::AppHandle,
    terms: State<'_, terminal::TerminalState>,
    ws: State<'_, WorkspaceState>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let cwd = workspace::get_root(&ws)?.map(|p| p.to_string_lossy().into_owned());
    terminal::create_session(&terms, app, cwd, cols, rows)
}

#[tauri::command]
fn terminal_write(
    terms: State<'_, terminal::TerminalState>,
    id: String,
    data: String,
) -> Result<(), String> {
    terminal::write_session(&terms, &id, &data)
}

#[tauri::command]
fn terminal_resize(
    terms: State<'_, terminal::TerminalState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    terminal::resize_session(&terms, &id, cols, rows)
}

#[tauri::command]
fn terminal_kill(terms: State<'_, terminal::TerminalState>, id: String) -> Result<(), String> {
    terminal::kill_session(&terms, &id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_logging();
    info!("SmartIDE starting");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WorkspaceState::default())
        .manage(WatchState::default())
        .manage(terminal::TerminalState::default())
        .invoke_handler(tauri::generate_handler![
            list_ai_providers,
            set_api_key,
            get_api_key,
            delete_api_key,
            has_api_key,
            list_ai_models,
            ai_chat,
            pick_workspace_folder,
            open_workspace,
            list_workspace,
            read_workspace_file,
            write_workspace_file,
            workspace_root,
            create_workspace_file,
            create_workspace_dir,
            rename_workspace_path,
            delete_workspace_path,
            reveal_in_os,
            search_workspace,
            terminal_create,
            terminal_write,
            terminal_resize,
            terminal_kill
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
