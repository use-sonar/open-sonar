use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_input_tokens: u64,
    pub cache_creation_input_tokens: u64,
}

impl Default for TokenUsage {
    fn default() -> Self {
        Self {
            input_tokens: 0,
            output_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedMessage {
    pub message_type: String,
    pub session_id: String,
    pub timestamp: String,
    pub model: Option<String>,
    pub usage: Option<TokenUsage>,
    pub content_text: Option<String>,
    pub tool_calls: Vec<String>,
}

pub fn parse_jsonl_line(line: &str) -> Option<ParsedMessage> {
    let value: serde_json::Value = serde_json::from_str(line).ok()?;

    let msg_type = value.get("type")?.as_str()?.to_string();

    if msg_type == "file-history-snapshot" {
        return None;
    }

    let session_id = value
        .get("sessionId")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let timestamp = value
        .get("timestamp")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let message = value.get("message");

    let model = message
        .and_then(|m| m.get("model"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let usage = message.and_then(|m| m.get("usage")).and_then(|u| {
        Some(TokenUsage {
            input_tokens: u.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
            output_tokens: u.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
            cache_read_input_tokens: u
                .get("cache_read_input_tokens")
                .and_then(|v| v.as_u64())
                .unwrap_or(0),
            cache_creation_input_tokens: u
                .get("cache_creation_input_tokens")
                .and_then(|v| v.as_u64())
                .unwrap_or(0),
        })
    });

    let mut content_text = None;
    let mut tool_calls = Vec::new();

    if let Some(content) = message.and_then(|m| m.get("content")) {
        if let Some(arr) = content.as_array() {
            for item in arr {
                if let Some(item_type) = item.get("type").and_then(|v| v.as_str()) {
                    match item_type {
                        "text" => {
                            if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                                content_text = Some(text.to_string());
                            }
                        }
                        "tool_use" => {
                            if let Some(name) = item.get("name").and_then(|v| v.as_str()) {
                                tool_calls.push(name.to_string());
                            }
                        }
                        _ => {}
                    }
                }
            }
        } else if let Some(text) = content.as_str() {
            content_text = Some(text.to_string());
        }
    }

    Some(ParsedMessage {
        message_type: msg_type,
        session_id,
        timestamp,
        model,
        usage,
        content_text,
        tool_calls,
    })
}
