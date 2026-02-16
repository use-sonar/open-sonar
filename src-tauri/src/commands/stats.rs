use crate::db::{Database, SessionRecord};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn get_recent_sessions(
    limit: u32,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<SessionRecord>, String> {
    db.get_recent_sessions(limit)
}

#[tauri::command]
pub fn get_total_cost_today(
    db: State<'_, Arc<Database>>,
) -> Result<f64, String> {
    db.get_total_cost_today()
}

#[tauri::command]
pub fn save_session(
    record: SessionRecord,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    db.upsert_session(&record)
}
