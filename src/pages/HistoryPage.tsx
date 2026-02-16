import { useEffect, useState } from "react";

const isTauri = !!(window as any).__TAURI_INTERNALS__;
const font = "Menlo, Monaco, 'SF Mono', monospace";

interface Session {
  id: string; project: string; model: string; total_cost: number; total_tokens: number;
  input_tokens: number; output_tokens: number; cache_read_tokens: number;
  cache_creation_tokens: number; duration_ms: number; status: string;
  tool_calls: number; started_at: string; ended_at: string | null;
}

interface Message {
  id: number; session_id: string; message_type: string; timestamp: string;
  model: string | null; input_tokens: number; output_tokens: number;
  cache_read_tokens: number; cache_creation_tokens: number; cost: number;
  content_preview: string | null; tool_name: string | null;
}

const fmtCost = (c: number) => c < 0.01 ? `$${c.toFixed(4)}` : c < 1 ? `$${c.toFixed(3)}` : `$${c.toFixed(2)}`;
const fmtTokens = (t: number) => t >= 1_000_000 ? `${(t / 1_000_000).toFixed(1)}M` : t >= 1_000 ? `${(t / 1_000).toFixed(1)}k` : `${t}`;
const fmtDuration = (ms: number) => { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); return m > 0 ? `${m}m${s % 60}s` : `${s}s`; };
const fmtDate = (d: string) => { try { return new Date(d).toLocaleString(); } catch { return d; } };

export function HistoryPage({ onExport }: { onExport: (sessions: Session[]) => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    if (!isTauri) return;
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke("get_recent_sessions", { limit: 500 }) as Session[];
    setSessions(data);
  };

  const importHistory = async () => {
    if (!isTauri) return;
    setImporting(true);
    const { invoke } = await import("@tauri-apps/api/core");
    const count = await invoke("import_history") as number;
    setImporting(false);
    await load();
    alert(`Imported ${count} sessions`);
  };

  const loadMessages = async (sessionId: string) => {
    if (!isTauri) return;
    setSelected(sessionId);
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke("get_session_messages", { sessionId }) as Message[];
    setMessages(data);
  };

  useEffect(() => { load(); }, []);

  if (selected) {
    const session = sessions.find((s) => s.id === selected);
    return (
      <div style={{ padding: 20, fontFamily: font, fontSize: 13, color: "#d1d1d6", overflow: "auto", height: "100%" }}>
        <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#636366", cursor: "pointer", fontSize: 13, fontFamily: font, marginBottom: 16 }}>
          ← Back to sessions
        </button>
        {session && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{session.project || session.id}</div>
            <div style={{ color: "#636366" }}>
              {session.model} · {fmtCost(session.total_cost)} · {fmtTokens(session.total_tokens)} tokens · {fmtDuration(session.duration_ms)}
            </div>
            <div style={{ color: "#636366", marginTop: 4 }}>
              Input: {fmtTokens(session.input_tokens)} · Output: {fmtTokens(session.output_tokens)} · Cache read: {fmtTokens(session.cache_read_tokens)} · Cache create: {fmtTokens(session.cache_creation_tokens)}
            </div>
          </div>
        )}
        <div style={{ borderTop: "1px solid #2a2a2e", paddingTop: 12 }}>
          <div style={{ color: "#636366", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Message Timeline</div>
          {messages.map((m) => (
            <div key={m.id} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid #222222" }}>
              <span style={{ color: "#48484a", width: 60, flexShrink: 0, fontSize: 11 }}>
                {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ""}
              </span>
              <span style={{ color: m.message_type === "user" ? "#0a84ff" : "#32d74b", width: 50, flexShrink: 0 }}>
                {m.message_type === "user" ? "you" : "claude"}
              </span>
              <span style={{ color: "#9898a0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.tool_name ? `[${m.tool_name}] ` : ""}{m.content_preview || ""}
              </span>
              <span style={{ color: "#636366", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                {fmtCost(m.cost)}
              </span>
            </div>
          ))}
          {messages.length === 0 && <div style={{ color: "#48484a" }}>No messages recorded for this session.</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: font, fontSize: 13, color: "#d1d1d6", overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Session History</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={importHistory} disabled={importing} style={{ background: "none", border: "1px solid #2a2a2e", borderRadius: 6, color: "#636366", fontSize: 12, fontFamily: font, padding: "4px 10px", cursor: "pointer" }}>
            {importing ? "Importing..." : "Import from ~/.claude"}
          </button>
          <button onClick={() => onExport(sessions)} style={{ background: "none", border: "1px solid #2a2a2e", borderRadius: 6, color: "#636366", fontSize: 12, fontFamily: font, padding: "4px 10px", cursor: "pointer" }}>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #2a2a2e" }}>
        <div style={{ display: "flex", padding: "8px 0", color: "#48484a", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid #2a2a2e" }}>
          <span style={{ flex: 2 }}>Project</span>
          <span style={{ width: 80 }}>Model</span>
          <span style={{ width: 80, textAlign: "right" }}>Cost</span>
          <span style={{ width: 80, textAlign: "right" }}>Tokens</span>
          <span style={{ width: 70, textAlign: "right" }}>Duration</span>
          <span style={{ width: 60, textAlign: "right" }}>Tools</span>
          <span style={{ width: 140, textAlign: "right" }}>Date</span>
        </div>
        {sessions.map((s) => (
          <div key={s.id} onClick={() => loadMessages(s.id)} style={{ display: "flex", padding: "8px 0", borderBottom: "1px solid #222222", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1e1e1e"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ flex: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.project || s.id}</span>
            <span style={{ width: 80, color: "#636366" }}>{s.model.includes("opus") ? "Opus" : s.model.includes("sonnet") ? "Sonnet" : s.model.includes("haiku") ? "Haiku" : "—"}</span>
            <span style={{ width: 80, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtCost(s.total_cost)}</span>
            <span style={{ width: 80, textAlign: "right", color: "#9898a0", fontVariantNumeric: "tabular-nums" }}>{fmtTokens(s.total_tokens)}</span>
            <span style={{ width: 70, textAlign: "right", color: "#636366", fontVariantNumeric: "tabular-nums" }}>{fmtDuration(s.duration_ms)}</span>
            <span style={{ width: 60, textAlign: "right", color: "#636366", fontVariantNumeric: "tabular-nums" }}>{s.tool_calls}</span>
            <span style={{ width: 140, textAlign: "right", color: "#48484a" }}>{fmtDate(s.started_at)}</span>
          </div>
        ))}
        {sessions.length === 0 && <div style={{ padding: 20, color: "#48484a", textAlign: "center" }}>No sessions yet. Click "Import from ~/.claude" to load your history.</div>}
      </div>
    </div>
  );
}
