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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageRecord {
    pub id: i64,
    pub session_id: String,
    pub message_type: String,
    pub timestamp: String,
    pub model: Option<String>,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_creation_tokens: u64,
    pub cost: f64,
    pub content_preview: Option<String>,
    pub tool_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyCost {
    pub date: String,
    pub cost: f64,
    pub tokens: u64,
    pub sessions: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelStats {
    pub model: String,
    pub total_cost: f64,
    pub total_tokens: u64,
    pub session_count: u32,
    pub avg_cost_per_session: f64,
    pub avg_tokens_per_session: u64,
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
                status TEXT NOT NULL DEFAULT 'completed',
                tool_calls INTEGER NOT NULL DEFAULT 0,
                started_at TEXT NOT NULL,
                ended_at TEXT
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                message_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                model TEXT,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                cache_read_tokens INTEGER NOT NULL DEFAULT 0,
                cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
                cost REAL NOT NULL DEFAULT 0.0,
                content_preview TEXT,
                tool_name TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_model ON sessions(model);
            CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
            CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);",
        )
        .map_err(|e| e.to_string())?;

        Ok(Self { conn: Arc::new(Mutex::new(conn)) })
    }

    pub fn upsert_session(&self, r: &SessionRecord) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO sessions (id, agent_id, project, model, total_cost, total_tokens,
             input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
             duration_ms, status, tool_calls, started_at, ended_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
             ON CONFLICT(id) DO UPDATE SET
             model=excluded.model, total_cost=excluded.total_cost,
             total_tokens=excluded.total_tokens, input_tokens=excluded.input_tokens,
             output_tokens=excluded.output_tokens, cache_read_tokens=excluded.cache_read_tokens,
             cache_creation_tokens=excluded.cache_creation_tokens, duration_ms=excluded.duration_ms,
             status=excluded.status, tool_calls=excluded.tool_calls, ended_at=excluded.ended_at",
            params![r.id, r.agent_id, r.project, r.model, r.total_cost, r.total_tokens,
                    r.input_tokens, r.output_tokens, r.cache_read_tokens, r.cache_creation_tokens,
                    r.duration_ms, r.status, r.tool_calls, r.started_at, r.ended_at],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn insert_message(&self, m: &MessageRecord) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO messages (session_id, message_type, timestamp, model,
             input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
             cost, content_preview, tool_name)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            params![m.session_id, m.message_type, m.timestamp, m.model,
                    m.input_tokens, m.output_tokens, m.cache_read_tokens,
                    m.cache_creation_tokens, m.cost, m.content_preview, m.tool_name],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_recent_sessions(&self, limit: u32) -> Result<Vec<SessionRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, project, model, total_cost, total_tokens,
             input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
             duration_ms, status, tool_calls, started_at, ended_at
             FROM sessions ORDER BY started_at DESC LIMIT ?1"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map(params![limit], |row| {
            Ok(SessionRecord {
                id: row.get(0)?, agent_id: row.get(1)?, project: row.get(2)?,
                model: row.get(3)?, total_cost: row.get(4)?, total_tokens: row.get(5)?,
                input_tokens: row.get(6)?, output_tokens: row.get(7)?,
                cache_read_tokens: row.get(8)?, cache_creation_tokens: row.get(9)?,
                duration_ms: row.get(10)?, status: row.get(11)?, tool_calls: row.get(12)?,
                started_at: row.get(13)?, ended_at: row.get(14)?,
            })
        }).map_err(|e| e.to_string())?;

        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn get_session_messages(&self, session_id: &str) -> Result<Vec<MessageRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, session_id, message_type, timestamp, model,
             input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
             cost, content_preview, tool_name
             FROM messages WHERE session_id = ?1 ORDER BY timestamp ASC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map(params![session_id], |row| {
            Ok(MessageRecord {
                id: row.get(0)?, session_id: row.get(1)?, message_type: row.get(2)?,
                timestamp: row.get(3)?, model: row.get(4)?, input_tokens: row.get(5)?,
                output_tokens: row.get(6)?, cache_read_tokens: row.get(7)?,
                cache_creation_tokens: row.get(8)?, cost: row.get(9)?,
                content_preview: row.get(10)?, tool_name: row.get(11)?,
            })
        }).map_err(|e| e.to_string())?;

        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn get_daily_costs(&self, days: u32) -> Result<Vec<DailyCost>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT DATE(started_at) as day, SUM(total_cost), SUM(total_tokens), COUNT(*)
             FROM sessions
             WHERE started_at >= DATE('now', ?1)
             GROUP BY day ORDER BY day ASC"
        ).map_err(|e| e.to_string())?;

        let offset = format!("-{} days", days);
        let rows = stmt.query_map(params![offset], |row| {
            Ok(DailyCost {
                date: row.get(0)?, cost: row.get(1)?, tokens: row.get(2)?, sessions: row.get(3)?,
            })
        }).map_err(|e| e.to_string())?;

        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn get_model_stats(&self) -> Result<Vec<ModelStats>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT model, SUM(total_cost), SUM(total_tokens), COUNT(*),
             AVG(total_cost), AVG(total_tokens)
             FROM sessions WHERE model != 'unknown'
             GROUP BY model ORDER BY SUM(total_cost) DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok(ModelStats {
                model: row.get(0)?, total_cost: row.get(1)?, total_tokens: row.get(2)?,
                session_count: row.get(3)?, avg_cost_per_session: row.get(4)?,
                avg_tokens_per_session: row.get::<_, f64>(5).map(|v| v as u64)?,
            })
        }).map_err(|e| e.to_string())?;

        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn get_total_cost_today(&self) -> Result<f64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        conn.query_row(
            "SELECT COALESCE(SUM(total_cost), 0.0) FROM sessions WHERE started_at >= ?1",
            params![today], |row| row.get(0),
        ).map_err(|e| e.to_string())
    }

    pub fn session_exists(&self, id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let count: u32 = conn.query_row(
            "SELECT COUNT(*) FROM sessions WHERE id = ?1", params![id], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        Ok(count > 0)
    }
}

fn get_db_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home.join(".open-sonar").join("sessions.db"))
}
