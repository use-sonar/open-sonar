use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRecord {
    pub id: String,
    pub agent_id: String,
    pub project: String,
    pub model: String,
    pub total_cost: f64,
    pub total_tokens: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_creation_tokens: u64,
    pub duration_ms: u64,
    pub status: String,
    pub tool_calls: u32,
    pub started_at: String,
    pub ended_at: Option<String>,
}

pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new() -> Result<Self, String> {
        let db_path = get_db_path()?;

        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                project TEXT NOT NULL DEFAULT '',
                model TEXT NOT NULL DEFAULT 'unknown',
                total_cost REAL NOT NULL DEFAULT 0.0,
                total_tokens INTEGER NOT NULL DEFAULT 0,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                cache_read_tokens INTEGER NOT NULL DEFAULT 0,
                cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
                duration_ms INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'running',
                tool_calls INTEGER NOT NULL DEFAULT 0,
                started_at TEXT NOT NULL,
                ended_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);",
        )
        .map_err(|e| e.to_string())?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn upsert_session(&self, record: &SessionRecord) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO sessions (id, agent_id, project, model, total_cost, total_tokens,
             input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
             duration_ms, status, tool_calls, started_at, ended_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
             ON CONFLICT(id) DO UPDATE SET
             model = excluded.model,
             total_cost = excluded.total_cost,
             total_tokens = excluded.total_tokens,
             input_tokens = excluded.input_tokens,
             output_tokens = excluded.output_tokens,
             cache_read_tokens = excluded.cache_read_tokens,
             cache_creation_tokens = excluded.cache_creation_tokens,
             duration_ms = excluded.duration_ms,
             status = excluded.status,
             tool_calls = excluded.tool_calls,
             ended_at = excluded.ended_at",
            params![
                record.id,
                record.agent_id,
                record.project,
                record.model,
                record.total_cost,
                record.total_tokens,
                record.input_tokens,
                record.output_tokens,
                record.cache_read_tokens,
                record.cache_creation_tokens,
                record.duration_ms,
                record.status,
                record.tool_calls,
                record.started_at,
                record.ended_at,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_recent_sessions(&self, limit: u32) -> Result<Vec<SessionRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, agent_id, project, model, total_cost, total_tokens,
                 input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
                 duration_ms, status, tool_calls, started_at, ended_at
                 FROM sessions ORDER BY started_at DESC LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![limit], |row| {
                Ok(SessionRecord {
                    id: row.get(0)?,
                    agent_id: row.get(1)?,
                    project: row.get(2)?,
                    model: row.get(3)?,
                    total_cost: row.get(4)?,
                    total_tokens: row.get(5)?,
                    input_tokens: row.get(6)?,
                    output_tokens: row.get(7)?,
                    cache_read_tokens: row.get(8)?,
                    cache_creation_tokens: row.get(9)?,
                    duration_ms: row.get(10)?,
                    status: row.get(11)?,
                    tool_calls: row.get(12)?,
                    started_at: row.get(13)?,
                    ended_at: row.get(14)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut records = Vec::new();
        for row in rows {
            records.push(row.map_err(|e| e.to_string())?);
        }
        Ok(records)
    }

    pub fn get_total_cost_today(&self) -> Result<f64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let cost: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(total_cost), 0.0) FROM sessions WHERE started_at >= ?1",
                params![today],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok(cost)
    }
}

fn get_db_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home.join(".open-sonar").join("sessions.db"))
}
