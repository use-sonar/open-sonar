import { useState, useEffect, useCallback } from "react";
import { ShellTerminal } from "./ShellTerminal";
import { AgentHeader } from "./AgentHeader";

const isTauri = !!(window as any).__TAURI_INTERNALS__;

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

const formatCost = (c: number) => c < 0.01 ? `$${c.toFixed(4)}` : c < 1 ? `$${c.toFixed(3)}` : `$${c.toFixed(2)}`;
const formatTokens = (t: number) => t >= 1_000_000 ? `${(t / 1_000_000).toFixed(1)}M` : t >= 1_000 ? `${(t / 1_000).toFixed(1)}k` : `${t}`;

let counter = 1;

export default function App() {
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
    setData((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
    if (isTauri) {
      import("@tauri-apps/api/core").then(({ invoke }) => invoke("kill_agent", { agentId: id }).catch(() => {}));
    }
  };

  const updateAgent = useCallback((id: string, updates: Partial<AgentData>) => {
    setData((prev) => ({ ...prev, [id]: { ...(prev[id] || defaultAgent()), ...updates } }));
  }, []);

  // Listen for session-update and agent-detected events from Rust
  useEffect(() => {
    if (!isTauri) return;

    let offUpdate: (() => void) | null = null;
    let offDetect: (() => void) | null = null;

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("session-update", (e: any) => {
        const p = e.payload;
        updateAgent(p.agent_id, {
          status: "running",
          cost: p.total_cost,
          tokens: p.total_tokens,
          messages: p.message_count,
          model: p.model || undefined,
        });
      }).then((fn) => { offUpdate = fn; });

      listen("agent-detected", (e: any) => {
        const p = e.payload;
        updateAgent(p.agent_id, {
          name: p.task,
          status: "running",
          startedAt: Date.now(),
        });
      }).then((fn) => { offDetect = fn; });
    });

    return () => { offUpdate?.(); offDetect?.(); };
  }, [updateAgent]);

  // Timer for running agents duration
  useEffect(() => {
    const interval = setInterval(() => {
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
    return () => clearInterval(interval);
  }, []);

  // Totals for footer
  const totalCost = Object.values(data).reduce((s, a) => s + a.cost, 0);
  const totalTokens = Object.values(data).reduce((s, a) => s + a.tokens, 0);
  const runningCount = Object.values(data).filter((a) => a.status === "running").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", background: "#171717" }}>
      {/* Main area */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {agents.map((id) => {
          const a = data[id] || defaultAgent();
          return (
            <div
              key={id}
              style={{ width: 500, height: "100%", borderRight: "1px solid #2a2a2e", flexShrink: 0, overflow: "hidden" }}
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <AgentHeader
                  id={id}
                  status={a.status}
                  name={a.name}
                  cost={a.cost}
                  duration={a.duration}
                  model={a.model}
                  tokens={a.tokens}
                  messages={a.messages}
                  onRename={(n) => updateAgent(id, { name: n })}
                  onClose={agents.length > 1 ? () => removeAgent(id) : undefined}
                />
                <div style={{ height: 1, background: "#2a2a2e", flexShrink: 0 }} />
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ShellTerminal id={id} />
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ display: "flex", alignItems: "flex-start", padding: 12, flexShrink: 0 }}>
          <button
            onClick={addAgent}
            style={{
              background: "none", border: "1px solid #2a2a2e", borderRadius: 8,
              color: "#636366", fontSize: 13, padding: "6px 12px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#48484a"; e.currentTarget.style.color = "#d1d1d6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2e"; e.currentTarget.style.color = "#636366"; }}
          >
            + Agent
          </button>
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: "#2a2a2e", flexShrink: 0 }} />

      {/* Footer */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 24, height: 32, background: "#171717", fontSize: 11, color: "#636366",
          flexShrink: 0, fontFamily: "Menlo, Monaco, 'SF Mono', monospace",
        }}
      >
        <span>cost <strong style={{ color: "#9898a0", marginLeft: 4 }}>{formatCost(totalCost)}</strong></span>
        <span style={{ width: 1, height: 12, background: "#2a2a2e" }} />
        <span>tokens <strong style={{ color: "#9898a0", marginLeft: 4 }}>{formatTokens(totalTokens)}</strong></span>
        <span style={{ width: 1, height: 12, background: "#2a2a2e" }} />
        <span>running <strong style={{ color: runningCount > 0 ? "#32d74b" : "#9898a0", marginLeft: 4 }}>{runningCount}</strong></span>
        <span style={{ width: 1, height: 12, background: "#2a2a2e" }} />
        <span>agents <strong style={{ color: "#9898a0", marginLeft: 4 }}>{agents.length}</strong></span>
      </div>
    </div>
  );
}
