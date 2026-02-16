use std::collections::HashMap;
use std::sync::{Arc, Mutex};

const WINDOW_SIZE: usize = 10;
const REPEAT_THRESHOLD: usize = 3;
const MIN_CHUNK_LENGTH: usize = 50;

struct AgentWindow {
    chunks: Vec<String>,
    loop_detected: bool,
    loop_count: u32,
}

pub struct LoopDetector {
    windows: Arc<Mutex<HashMap<String, AgentWindow>>>,
}

#[derive(Clone, serde::Serialize)]
pub struct LoopAlert {
    pub agent_id: String,
    pub pattern: String,
    pub repeat_count: usize,
    pub estimated_waste_usd: f64,
}

impl LoopDetector {
    pub fn new() -> Self {
        Self {
            windows: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn feed(&self, agent_id: &str, output: &str, burn_rate_per_sec: f64) -> Option<LoopAlert> {
        let mut windows = self.windows.lock().ok()?;

        let window = windows.entry(agent_id.to_string()).or_insert(AgentWindow {
            chunks: Vec::new(),
            loop_detected: false,
            loop_count: 0,
        });

        let normalized = normalize_output(output);
        if normalized.len() < MIN_CHUNK_LENGTH {
            return None;
        }

        window.chunks.push(normalized.clone());

        if window.chunks.len() > WINDOW_SIZE {
            window.chunks.remove(0);
        }

        if window.chunks.len() >= REPEAT_THRESHOLD {
            let last = &window.chunks[window.chunks.len() - 1];
            let repeat_count = window
                .chunks
                .iter()
                .rev()
                .take_while(|chunk| similarity(chunk, last) > 0.8)
                .count();

            if repeat_count >= REPEAT_THRESHOLD {
                window.loop_detected = true;
                window.loop_count += 1;

                let estimated_waste = burn_rate_per_sec * 30.0 * repeat_count as f64;

                return Some(LoopAlert {
                    agent_id: agent_id.to_string(),
                    pattern: truncate(last, 100),
                    repeat_count,
                    estimated_waste_usd: estimated_waste,
                });
            }
        }

        None
    }

    pub fn reset(&self, agent_id: &str) {
        if let Ok(mut windows) = self.windows.lock() {
            windows.remove(agent_id);
        }
    }

    pub fn is_looping(&self, agent_id: &str) -> bool {
        self.windows
            .lock()
            .ok()
            .and_then(|w| w.get(agent_id).map(|a| a.loop_detected))
            .unwrap_or(false)
    }
}

fn normalize_output(output: &str) -> String {
    output
        .chars()
        .filter(|c| !c.is_whitespace() || *c == ' ')
        .collect::<String>()
        .to_lowercase()
}

fn similarity(a: &str, b: &str) -> f64 {
    if a == b {
        return 1.0;
    }
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }

    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let max_len = a_chars.len().max(b_chars.len());
    let matching = a_chars
        .iter()
        .zip(b_chars.iter())
        .filter(|(a, b)| a == b)
        .count();

    matching as f64 / max_len as f64
}

fn truncate(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len])
    }
}
