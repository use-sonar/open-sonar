import { ShellTerminal } from "../ShellTerminal";
import { AgentHeader } from "../AgentHeader";

interface AgentData {
  name?: string;
  status: "idle" | "running" | "completed" | "error";
  cost: number;
  tokens: number;
  messages: number;
  model?: string;
  duration: number;
}

export function TerminalsPage({
  agents,
  data,
  onAdd,
  onRemove,
  onUpdate,
}: {
  agents: string[];
  data: Record<string, AgentData>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<AgentData>) => void;
}) {
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {agents.map((id) => {
        const a = data[id] || { status: "idle", cost: 0, tokens: 0, messages: 0, duration: 0 };
        return (
          <div key={id} style={{ width: 500, height: "100%", borderRight: "1px solid #2a2a2e", flexShrink: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <AgentHeader
                id={id} status={a.status} name={a.name} cost={a.cost}
                duration={a.duration} model={a.model} tokens={a.tokens} messages={a.messages}
                onRename={(n) => onUpdate(id, { name: n })}
                onClose={agents.length > 1 ? () => onRemove(id) : undefined}
              />
              <div style={{ height: 1, background: "#2a2a2e", flexShrink: 0 }} />
              <div style={{ flex: 1, minHeight: 0 }}><ShellTerminal id={id} /></div>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", alignItems: "flex-start", padding: 12, flexShrink: 0 }}>
        <button onClick={onAdd} style={{ background: "none", border: "1px solid #2a2a2e", borderRadius: 8, color: "#636366", fontSize: 13, padding: "6px 12px", cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#48484a"; e.currentTarget.style.color = "#d1d1d6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2e"; e.currentTarget.style.color = "#636366"; }}
        >+ Agent</button>
      </div>
    </div>
  );
}
