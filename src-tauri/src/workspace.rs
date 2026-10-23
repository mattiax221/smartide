//! Workspace file system helpers (open folder, list, read, write).

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use thiserror::Error;

const IGNORE_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    ".next",
    "__pycache__",
    ".venv",
    "venv",
];
const MAX_ENTRIES: usize = 4_000;
const MAX_FILE_BYTES: u64 = 2_000_000;

#[derive(Default)]
pub struct WorkspaceState {
    pub root: Mutex<Option<PathBuf>>,
}

#[derive(Debug, Error)]
pub enum WorkspaceError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Msg(String),
}

impl From<WorkspaceError> for String {
    fn from(value: WorkspaceError) -> Self {
        value.to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub kind: String,
    pub parent: Option<String>,
    pub language: String,
}

pub fn set_root(state: &WorkspaceState, root: PathBuf) -> Result<(), WorkspaceError> {
    if !root.is_dir() {
        return Err(WorkspaceError::Msg(format!(
            "Not a directory: {}",
            root.display()
        )));
    }
    *state
        .root
        .lock()
        .map_err(|_| WorkspaceError::Msg("lock".into()))? = Some(root);
    Ok(())
}

pub fn get_root(state: &WorkspaceState) -> Result<Option<PathBuf>, WorkspaceError> {
    Ok(state
        .root
        .lock()
        .map_err(|_| WorkspaceError::Msg("lock".into()))?
        .clone())
}

fn ensure_under_root(root: &Path, path: &Path) -> Result<PathBuf, WorkspaceError> {
    let root_c = root
        .canonicalize()
        .map_err(|e| WorkspaceError::Msg(format!("root: {e}")))?;
    let path_c = if path.exists() {
        path.canonicalize()
            .map_err(|e| WorkspaceError::Msg(format!("path: {e}")))?
    } else {
        let parent = path
            .parent()
            .ok_or_else(|| WorkspaceError::Msg("invalid path".into()))?;
        let name = path
            .file_name()
            .ok_or_else(|| WorkspaceError::Msg("invalid path".into()))?;
        parent
            .canonicalize()
            .map_err(|e| WorkspaceError::Msg(format!("parent: {e}")))?
            .join(name)
    };
    if !path_c.starts_with(&root_c) {
        return Err(WorkspaceError::Msg("Path escapes workspace root".into()));
    }
    Ok(path_c)
}

pub fn language_for(path: &Path) -> String {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "ts" | "mts" | "cts" | "tsx" => "typescript",
        "js" | "mjs" | "cjs" | "jsx" => "javascript",
        "rs" => "rust",
        "json" => "json",
        "md" | "mdx" => "markdown",
        "css" => "css",
        "html" | "htm" => "html",
        "py" => "python",
        "toml" => "toml",
        "yaml" | "yml" => "yaml",
        "sh" | "bash" => "shell",
        "go" => "go",
        "java" => "java",
        "c" => "c",
        "cpp" | "cc" | "cxx" | "h" | "hpp" => "cpp",
        _ => "plaintext",
    }
    .into()
}

fn parent_id(path: &Path, root: &Path) -> Option<String> {
    path.parent().and_then(|p| {
        if p == root {
            None
        } else {
            Some(p.to_string_lossy().to_string())
        }
    })
}

pub fn list_tree(root: &Path) -> Result<Vec<FsEntry>, WorkspaceError> {
    let mut out = Vec::new();

    fn walk(dir: &Path, root: &Path, out: &mut Vec<FsEntry>) -> Result<(), WorkspaceError> {
        if out.len() >= MAX_ENTRIES {
            return Ok(());
        }
        let mut entries: Vec<_> = fs::read_dir(dir)?.filter_map(|e| e.ok()).collect();
        entries.sort_by_key(|e| {
            (
                !e.path().is_dir(),
                e.file_name().to_string_lossy().to_lowercase(),
            )
        });
        for entry in entries {
            if out.len() >= MAX_ENTRIES {
                break;
            }
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if path.is_dir() {
                if IGNORE_DIRS.iter().any(|d| *d == name) {
                    continue;
                }
                out.push(FsEntry {
                    id: path.to_string_lossy().to_string(),
                    name,
                    path: path.to_string_lossy().to_string(),
                    kind: "folder".into(),
                    parent: parent_id(&path, root),
                    language: String::new(),
                });
                walk(&path, root, out)?;
            } else if path.is_file() {
                out.push(FsEntry {
                    id: path.to_string_lossy().to_string(),
                    name,
                    path: path.to_string_lossy().to_string(),
                    kind: "file".into(),
                    parent: parent_id(&path, root),
                    language: language_for(&path),
                });
            }
        }
        Ok(())
    }

    walk(root, root, &mut out)?;
    Ok(out)
}

pub fn read_text(state: &WorkspaceState, path: &Path) -> Result<String, WorkspaceError> {
    let root = get_root(state)?.ok_or_else(|| WorkspaceError::Msg("No workspace open".into()))?;
    let path = ensure_under_root(&root, path)?;
    let meta = fs::metadata(&path)?;
    if meta.len() > MAX_FILE_BYTES {
        return Err(WorkspaceError::Msg(format!(
            "File too large ({} bytes)",
            meta.len()
        )));
    }
    fs::read_to_string(&path).map_err(Into::into)
}

pub fn write_text(state: &WorkspaceState, path: &Path, content: &str) -> Result<(), WorkspaceError> {
    let root = get_root(state)?.ok_or_else(|| WorkspaceError::Msg("No workspace open".into()))?;
    let path = ensure_under_root(&root, path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, content)?;
    Ok(())
}
