//! Integrated PTY sessions for the bottom panel.

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tracing::{info, warn};
use uuid::Uuid;

pub struct TerminalState {
    inner: Mutex<HashMap<String, Session>>,
}

struct Session {
    writer: Mutex<Box<dyn Write + Send>>,
    _master: Box<dyn MasterPty + Send>,
    child: Mutex<Box<dyn portable_pty::Child + Send + Sync>>,
}

impl Default for TerminalState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Clone, Serialize)]
struct TerminalDataEvent {
    id: String,
    data: String,
}

fn default_shell() -> CommandBuilder {
    #[cfg(target_os = "windows")]
    {
        let mut cmd = CommandBuilder::new("powershell.exe");
        cmd.arg("-NoLogo");
        cmd
    }
    #[cfg(not(target_os = "windows"))]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into());
        CommandBuilder::new(shell)
    }
}

pub fn create_session(
    state: &TerminalState,
    app: AppHandle,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: rows.max(10),
            cols: cols.max(40),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = default_shell();
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| e.to_string())?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| e.to_string())?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    {
        let mut map = state.inner.lock().map_err(|e| e.to_string())?;
        map.insert(
            id.clone(),
            Session {
                writer: Mutex::new(writer),
                _master: pair.master,
                child: Mutex::new(child),
            },
        );
    }

    let emit_id = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app.emit(
                        "terminal-data",
                        TerminalDataEvent {
                            id: emit_id.clone(),
                            data,
                        },
                    );
                }
                Err(e) => {
                    warn!(error = %e, "pty read ended");
                    break;
                }
            }
        }
        info!(id = %emit_id, "pty reader exit");
    });

    Ok(id)
}

pub fn write_session(state: &TerminalState, id: &str, data: &str) -> Result<(), String> {
    let map = state.inner.lock().map_err(|e| e.to_string())?;
    let session = map.get(id).ok_or_else(|| "Unknown terminal".to_string())?;
    let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
    writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn resize_session(state: &TerminalState, id: &str, cols: u16, rows: u16) -> Result<(), String> {
    let map = state.inner.lock().map_err(|e| e.to_string())?;
    let session = map.get(id).ok_or_else(|| "Unknown terminal".to_string())?;
    session
        ._master
        .resize(PtySize {
            rows: rows.max(5),
            cols: cols.max(20),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

pub fn kill_session(state: &TerminalState, id: &str) -> Result<(), String> {
    let mut map = state.inner.lock().map_err(|e| e.to_string())?;
    if let Some(session) = map.remove(id) {
        if let Ok(mut child) = session.child.lock() {
            let _ = child.kill();
        }
    }
    Ok(())
}
