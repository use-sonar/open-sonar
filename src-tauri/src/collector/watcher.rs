use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

use super::cost::calculate_cost;
use super::parser::{parse_jsonl_line, TokenUsage};

#[derive(Clone, serde::Serialize)]
pub struct SessionUpdate {
    pub agent_id: String,
    pub session_id: String,
    pub model: Option<String>,
    pub total_tokens: u64,
    pub total_cost: f64,
    pub message_count: u32,
    pub tool_calls: Vec<String>,
    pub usage: TokenUsage,
}

#[derive(Clone, serde::Serialize)]
pub struct AgentDetected {
    pub agent_id: String,
    pub session_id: String,
    pub task: String,
}

struct TrackedFile {
    offset: u64,
    agent_id: String,
    cumulative_tokens: u64,
    cumulative_cost: f64,
    cumulative_messages: u32,
    cumulative_tool_calls: Vec<String>,
    last_model: Option<String>,
    cumulative_usage: TokenUsage,
}

pub struct SessionWatcher {
    tracked: Arc<Mutex<HashMap<PathBuf, TrackedFile>>>,
    agent_dirs: Arc<Mutex<HashMap<String, String>>>,
    _watcher: Option<RecommendedWatcher>,
}

impl SessionWatcher {
    pub fn new() -> Self {
        Self {
            tracked: Arc::new(Mutex::new(HashMap::new())),
            agent_dirs: Arc::new(Mutex::new(HashMap::new())),
            _watcher: None,
        }
    }

    pub fn register_agent(&self, agent_id: &str, working_dir: &str) {
        if let Ok(mut dirs) = self.agent_dirs.lock() {
            dirs.insert(working_dir.to_string(), agent_id.to_string());
        }
    }

    pub fn start(&mut self, app_handle: AppHandle) -> Result<(), String> {
        let claude_dir = get_claude_projects_dir()
            .ok_or_else(|| "No ~/.claude/projects directory found".to_string())?;

        let tracked = self.tracked.clone();
        let agent_dirs = self.agent_dirs.clone();

        let watcher_result = notify::recommended_watcher(
            move |res: Result<notify::Event, notify::Error>| {
                if let Ok(event) = res {
                    match event.kind {
                        EventKind::Modify(_) | EventKind::Create(_) => {
                            for path in &event.paths {
                                if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
                                    let _ = process_changes(
                                        path,
                                        &tracked,
                                        &agent_dirs,
                                        &app_handle,
                                    );
                                }
                            }
                        }
                        _ => {}
                    }
                }
            },
        );

        match watcher_result {
            Ok(mut w) => {
                let _ = w.watch(&claude_dir, RecursiveMode::Recursive);
                self._watcher = Some(w);
                Ok(())
            }
            Err(e) => Err(format!("Watcher failed: {}", e)),
        }
    }
}

fn dir_to_agent_id(
    jsonl_path: &PathBuf,
    agent_dirs: &Arc<Mutex<HashMap<String, String>>>,
) -> Option<String> {
    let parent = jsonl_path.parent()?;
    let encoded_dir = parent.file_name()?.to_str()?;

    let decoded = encoded_dir.replace('-', "/");

    if let Ok(dirs) = agent_dirs.lock() {
        for (registered_dir, agent_id) in dirs.iter() {
            if decoded.contains(registered_dir) || registered_dir.contains(&decoded) {
                return Some(agent_id.clone());
            }
            let registered_encoded = registered_dir.replace('/', "-");
            if encoded_dir.contains(&registered_encoded) {
                return Some(agent_id.clone());
            }
        }

        if dirs.len() == 1 {
            return Some(dirs.values().next().unwrap().clone());
        }
    }

    None
}

fn process_changes(
    path: &PathBuf,
    tracked: &Arc<Mutex<HashMap<PathBuf, TrackedFile>>>,
    agent_dirs: &Arc<Mutex<HashMap<String, String>>>,
    app_handle: &AppHandle,
) -> Result<(), String> {
    let agent_id = match dir_to_agent_id(path, agent_dirs) {
        Some(id) => id,
        None => return Ok(()),
    };

    let mut tracked_guard = tracked.lock().map_err(|e| e.to_string())?;

    let entry = tracked_guard.entry(path.clone()).or_insert_with(|| TrackedFile {
        offset: 0,
        agent_id: agent_id.clone(),
        cumulative_tokens: 0,
        cumulative_cost: 0.0,
        cumulative_messages: 0,
        cumulative_tool_calls: Vec::new(),
        last_model: None,
        cumulative_usage: TokenUsage::default(),
    });

    entry.agent_id = agent_id.clone();

    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    reader.seek(SeekFrom::Start(entry.offset)).map_err(|e| e.to_string())?;

    let mut new_messages = 0u32;
    let mut line = String::new();

    while reader.read_line(&mut line).map_err(|e| e.to_string())? > 0 {
        if let Some(parsed) = parse_jsonl_line(line.trim()) {
            if parsed.session_id.is_empty() {
                line.clear();
                continue;
            }

            if let Some(ref model) = parsed.model {
                entry.last_model = Some(model.clone());
            }

            if let Some(ref usage) = parsed.usage {
                let msg_tokens = usage.input_tokens
                    + usage.output_tokens
                    + usage.cache_read_input_tokens
                    + usage.cache_creation_input_tokens;
                entry.cumulative_tokens += msg_tokens;

                entry.cumulative_usage.input_tokens += usage.input_tokens;
                entry.cumulative_usage.output_tokens += usage.output_tokens;
                entry.cumulative_usage.cache_read_input_tokens += usage.cache_read_input_tokens;
                entry.cumulative_usage.cache_creation_input_tokens += usage.cache_creation_input_tokens;

                if let Some(ref model) = entry.last_model {
                    entry.cumulative_cost += calculate_cost(usage, model);
                }
            }

            entry.cumulative_tool_calls.extend(parsed.tool_calls);
            entry.cumulative_messages += 1;
            new_messages += 1;

            if parsed.message_type == "user" && entry.cumulative_messages == 1 {
                if let Some(ref text) = parsed.content_text {
                    let _ = app_handle.emit(
                        "agent-detected",
                        AgentDetected {
                            agent_id: agent_id.clone(),
                            session_id: parsed.session_id.clone(),
                            task: text.chars().take(80).collect(),
                        },
                    );
                }
            }
        }
        line.clear();
    }

    entry.offset = reader.seek(SeekFrom::Current(0)).map_err(|e| e.to_string())?;

    if new_messages > 0 {
        let _ = app_handle.emit(
            "session-update",
            SessionUpdate {
                agent_id,
                session_id: String::new(),
                model: entry.last_model.clone(),
                total_tokens: entry.cumulative_tokens,
                total_cost: entry.cumulative_cost,
                message_count: entry.cumulative_messages,
                tool_calls: entry.cumulative_tool_calls.clone(),
                usage: entry.cumulative_usage.clone(),
            },
        );
    }

    Ok(())
}

pub fn get_claude_projects_dir() -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let config_path = home.join(".config").join("claude").join("projects");
    if config_path.exists() {
        return Some(config_path);
    }
    let legacy_path = home.join(".claude").join("projects");
    if legacy_path.exists() {
        return Some(legacy_path);
    }
    None
}
