import { useState, useEffect, useCallback } from "react";
import { TerminalsPage } from "./pages/TerminalsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";

const isTauri = !!(window as any).__TAURI_INTERNALS__;
const font = "Menlo, Monaco, 'SF Mono', monospace";

type Tab = "terminals" | "history" | "analytics" | "settings";

interface AgentData {
  name?: string;
  status: "idle" | "running" | "completed" | "error";
  cost: number;
  tokens: number;
  messages: number;
  model?: string;
  duration: number;
  startedAt: number;
}

function defaultAgent(): AgentData {
  return { status: "idle", cost: 0, tokens: 0, messages: 0, duration: 0, startedAt: 0 };
}

const fmtCost = (c: number) => c < 0.01 ? `$${c.toFixed(4)}` : c < 1 ? `$${c.toFixed(3)}` : `$${c.toFixed(2)}`;
const fmtTokens = (t: number) => t >= 1_000_000 ? `${(t / 1_000_000).toFixed(1)}M` : t >= 1_000 ? `${(t / 1_000).toFixed(1)}k` : `${t}`;

let counter = 1;

export default function App() {
  const [tab, setTab] = useState<Tab>("terminals");
  const [agents, setAgents] = useState<string[]>(["agent-1"]);
  const [data, setData] = useState<Record<string, AgentData>>({ "agent-1": defaultAgent() });

  const addAgent = () => {
    counter++;
    const id = `agent-${counter}`;
    setAgents((prev) => [...prev, id]);
    setData((prev) => ({ ...prev, [id]: defaultAgent() }));
  };

  const removeAgent = (id: string) => {
    setAgents((prev) => prev.filter((a) => a !== id));
    setData((prev) => { const c = { ...prev }; delete c[id]; return c; });
    if (isTauri) {
      import("@tauri-apps/api/core").then(({ invoke }) => invoke("kill_agent", { agentId: id }).catch(() => {}));
    }
  };

  const updateAgent = useCallback((id: string, updates: Partial<AgentData>) => {
    setData((prev) => ({ ...prev, [id]: { ...(prev[id] || defaultAgent()), ...updates } }));
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    let offU: (() => void) | null = null;
    let offD: (() => void) | null = null;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("session-update", (e: any) => {
        const p = e.payload;
        updateAgent(p.agent_id, { status: "running", cost: p.total_cost, tokens: p.total_tokens, messages: p.message_count, model: p.model || undefined });
      }).then((fn) => { offU = fn; });
      listen("agent-detected", (e: any) => {
        const p = e.payload;
        updateAgent(p.agent_id, { name: p.task, status: "running", startedAt: Date.now() });
      }).then((fn) => { offD = fn; });
    });
    return () => { offU?.(); offD?.(); };
  }, [updateAgent]);

  useEffect(() => {
    const iv = setInterval(() => {
      setData((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(next)) {
          if (next[id].status === "running" && next[id].startedAt > 0) {
            next[id] = { ...next[id], duration: Date.now() - next[id].startedAt };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const totalCost = Object.values(data).reduce((s, a) => s + a.cost, 0);
  const totalTokens = Object.values(data).reduce((s, a) => s + a.tokens, 0);
  const runningCount = Object.values(data).filter((a) => a.status === "running").length;

  const exportCSV = (sessions: any[]) => {
    const header = "id,project,model,cost,tokens,duration_ms,tool_calls,started_at\n";
    const rows = sessions.map((s: any) => `${s.id},${s.project},${s.model},${s.total_cost},${s.total_tokens},${s.duration_ms},${s.tool_calls},${s.started_at}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sonar-sessions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", background: "#171717" }}>
      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        {tab === "terminals" && (
          <TerminalsPage agents={agents} data={data} onAdd={addAgent} onRemove={removeAgent} onUpdate={updateAgent} />
        )}
        {tab === "history" && <HistoryPage onExport={exportCSV} />}
        {tab === "analytics" && <AnalyticsPage />}
        {tab === "settings" && <SettingsPage />}
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: "#2a2a2e", flexShrink: 0 }} />

      {/* Footer with tabs + stats */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 34, padding: "0 16px", background: "#171717", fontSize: 11, fontFamily: font, flexShrink: 0 }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {(["terminals", "history", "analytics", "settings"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "#2a2a2e" : "transparent",
              border: "none", borderRadius: 4, color: tab === t ? "#d1d1d6" : "#48484a",
              fontSize: 11, fontFamily: font, padding: "3px 10px", cursor: "pointer",
              textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>

        {/* Live stats */}
        <div style={{ display: "flex", gap: 16, color: "#636366" }}>
          <span>cost <strong style={{ color: "#9898a0", marginLeft: 3 }}>{fmtCost(totalCost)}</strong></span>
          <span>tokens <strong style={{ color: "#9898a0", marginLeft: 3 }}>{fmtTokens(totalTokens)}</strong></span>
          <span>running <strong style={{ color: runningCount > 0 ? "#32d74b" : "#9898a0", marginLeft: 3 }}>{runningCount}</strong></span>
          <span>agents <strong style={{ color: "#9898a0", marginLeft: 3 }}>{agents.length}</strong></span>
        </div>
      </div>
    </div>
  );
}
