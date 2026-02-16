use crate::collector::watcher::SessionWatcher;
use crate::pty::manager::PtyManager;
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn spawn_shell(
    agent_id: String,
    working_dir: String,
    rows: u16,
    cols: u16,
    pty_manager: State<'_, Arc<PtyManager>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    pty_manager.spawn_shell(&agent_id, &working_dir, rows, cols, app_handle)
}

#[tauri::command]
pub fn spawn_agent(
    agent_id: String,
    task: String,
    working_dir: String,
    pty_manager: State<'_, Arc<PtyManager>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    pty_manager.spawn_agent(&agent_id, &task, &working_dir, app_handle)
}

#[tauri::command]
pub fn kill_agent(
    agent_id: String,
    pty_manager: State<'_, Arc<PtyManager>>,
) -> Result<(), String> {
    pty_manager.kill_agent(&agent_id)
}

#[tauri::command]
pub fn write_to_agent(
    agent_id: String,
    data: String,
    pty_manager: State<'_, Arc<PtyManager>>,
) -> Result<(), String> {
    pty_manager.write_to_agent(&agent_id, &data)
}

#[tauri::command]
pub fn resize_agent(
    agent_id: String,
    rows: u16,
    cols: u16,
    pty_manager: State<'_, Arc<PtyManager>>,
) -> Result<(), String> {
    pty_manager.resize_agent(&agent_id, rows, cols)
}

#[tauri::command]
pub fn is_agent_alive(
    agent_id: String,
    pty_manager: State<'_, Arc<PtyManager>>,
) -> bool {
    pty_manager.is_alive(&agent_id)
}

#[tauri::command]
pub fn register_agent_dir(
    agent_id: String,
    working_dir: String,
    watcher: State<'_, Arc<SessionWatcher>>,
) -> Result<(), String> {
    watcher.register_agent(&agent_id, &working_dir);
    Ok(())
}

#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not find home directory".to_string())
}
