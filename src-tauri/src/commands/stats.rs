use crate::collector::cost::calculate_cost;
use crate::collector::parser::parse_jsonl_line;
use crate::collector::watcher::get_claude_projects_dir;
use crate::db::{DailyCost, Database, MessageRecord, ModelStats, SessionRecord};
use std::fs::File;
use std::io::{BufRead, BufReader};
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
pub fn get_session_messages(
    session_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<MessageRecord>, String> {
    db.get_session_messages(&session_id)
}

#[tauri::command]
pub fn get_daily_costs(
    days: u32,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<DailyCost>, String> {
    db.get_daily_costs(days)
}

#[tauri::command]
pub fn get_model_stats(
    db: State<'_, Arc<Database>>,
) -> Result<Vec<ModelStats>, String> {
    db.get_model_stats()
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

#[tauri::command]
pub fn import_history(
    db: State<'_, Arc<Database>>,
) -> Result<u32, String> {
    let projects_dir = get_claude_projects_dir()
        .ok_or_else(|| "No ~/.claude/projects directory found".to_string())?;

    let mut imported = 0u32;

    for project_entry in std::fs::read_dir(&projects_dir).map_err(|e| e.to_string())? {
        let project_entry = project_entry.map_err(|e| e.to_string())?;
        if !project_entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            continue;
        }

        let project_name = project_entry
            .file_name()
            .to_string_lossy()
            .replace('-', "/");

        for file_entry in std::fs::read_dir(project_entry.path()).map_err(|e| e.to_string())? {
            let file_entry = file_entry.map_err(|e| e.to_string())?;
            let path = file_entry.path();

            if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
                let session_id = path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_string();

                if session_id.is_empty() || session_id.starts_with("agent-") {
                    continue;
                }

                if db.session_exists(&session_id).unwrap_or(true) {
                    continue;
                }

                if let Ok(record) = parse_session_file(&path, &session_id, &project_name, &db) {
                    if let Ok(()) = db.upsert_session(&record) {
                        imported += 1;
                    }
                }
            }
        }
    }

    Ok(imported)
}

fn parse_session_file(
    path: &std::path::Path,
    session_id: &str,
    project: &str,
    db: &Arc<Database>,
) -> Result<SessionRecord, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);

    let mut total_cost = 0.0f64;
    let mut total_tokens = 0u64;
    let mut input_tokens = 0u64;
    let mut output_tokens = 0u64;
    let mut cache_read = 0u64;
    let mut cache_creation = 0u64;
    let mut tool_calls = 0u32;
    let mut last_model = String::from("unknown");
    let mut first_ts = String::new();
    let mut last_ts = String::new();
    let mut msg_count = 0u32;

    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        if let Some(parsed) = parse_jsonl_line(line.trim()) {
            if !parsed.timestamp.is_empty() {
                if first_ts.is_empty() {
                    first_ts = parsed.timestamp.clone();
                }
                last_ts = parsed.timestamp.clone();
            }

            if let Some(ref model) = parsed.model {
                last_model = model.clone();
            }

            if let Some(ref usage) = parsed.usage {
                input_tokens += usage.input_tokens;
                output_tokens += usage.output_tokens;
                cache_read += usage.cache_read_input_tokens;
                cache_creation += usage.cache_creation_input_tokens;
                total_tokens += usage.input_tokens + usage.output_tokens
                    + usage.cache_read_input_tokens + usage.cache_creation_input_tokens;

                if last_model != "unknown" {
                    let msg_cost = calculate_cost(usage, &last_model);
                    total_cost += msg_cost;

                    let _ = db.insert_message(&MessageRecord {
                        id: 0,
                        session_id: session_id.to_string(),
                        message_type: parsed.message_type.clone(),
                        timestamp: parsed.timestamp.clone(),
                        model: Some(last_model.clone()),
                        input_tokens: usage.input_tokens,
                        output_tokens: usage.output_tokens,
                        cache_read_tokens: usage.cache_read_input_tokens,
                        cache_creation_tokens: usage.cache_creation_input_tokens,
                        cost: msg_cost,
                        content_preview: parsed.content_text.as_ref().map(|t| t.chars().take(200).collect()),
                        tool_name: parsed.tool_calls.first().cloned(),
                    });
                }
            }

            tool_calls += parsed.tool_calls.len() as u32;
            msg_count += 1;
        }
    }

    let duration_ms = if !first_ts.is_empty() && !last_ts.is_empty() {
        let start = chrono::DateTime::parse_from_rfc3339(&first_ts).ok();
        let end = chrono::DateTime::parse_from_rfc3339(&last_ts).ok();
        match (start, end) {
            (Some(s), Some(e)) => (e - s).num_milliseconds().max(0) as u64,
            _ => 0,
        }
    } else {
        0
    };

    Ok(SessionRecord {
        id: session_id.to_string(),
        agent_id: "imported".to_string(),
        project: project.to_string(),
        model: last_model,
        total_cost,
        total_tokens,
        input_tokens,
        output_tokens,
        cache_read_tokens: cache_read,
        cache_creation_tokens: cache_creation,
        duration_ms,
        status: "completed".to_string(),
        tool_calls,
        started_at: first_ts,
        ended_at: Some(last_ts),
    })
}
