import { useCallback } from "react";
import { useAgentStore } from "../../stores/agentStore";
import { useAgent } from "../../hooks/useAgent";
import { AgentHeader } from "./AgentHeader";
import { AgentKPI } from "./AgentKPI";
import { AgentSummary } from "./AgentSummary";
import { TerminalView } from "./Terminal";
import { TerminalInput } from "./TerminalInput";
import { invoke } from "@tauri-apps/api/core";

export function AgentColumn({ agentId }: { agentId: string }) {
  const agent = useAgentStore((s) => s.agents.find((a) => a.id === agentId));
  const removeAgent = useAgentStore((s) => s.removeAgent);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const { spawn, kill, write, resize } = useAgent(agentId);

  const handleSubmit = useCallback(async (task: string, workingDir: string) => {
    let resolved = workingDir;
    if (resolved === "~" || resolved === "") {
      try { resolved = await invoke<string>("get_home_dir"); } catch { resolved = "/tmp"; }
    } else if (resolved.startsWith("~/")) {
      try { const h = await invoke<string>("get_home_dir"); resolved = resolved.replace("~", h); } catch {}
    }
    spawn(task, resolved);
  }, [spawn]);

  const handleKill = useCallback(() => {
    kill();
    updateAgent(agentId, { status: "completed" });
  }, [kill, agentId, updateAgent]);

  if (!agent) return null;

  const agents = useAgentStore.getState().agents;
  const canRemove = agents.length > 1 && agent.status !== "running";
  const showInput = agent.status === "idle" || agent.status === "completed" || agent.status === "error";

  return (
    <div className="flex flex-col h-full">
      {/* Header zone */}
      <div className="px-5 pt-4 pb-3 space-y-3 shrink-0">
        <AgentHeader agent={agent} canRemove={canRemove} onRemove={() => removeAgent(agentId)} onKill={handleKill} />
        {agent.status !== "idle" && <AgentKPI agent={agent} />}
        {agent.status !== "idle" && <AgentSummary agent={agent} />}
      </div>

      {/* Terminal + Input — one unified block, same bg */}
      <div className="flex-1 min-h-0 flex flex-col bg-sonar-bg">
        <div className="flex-1 min-h-0">
          <TerminalView
            agentId={agentId}
            onResize={(r, c) => resize(r, c)}
            onData={(d) => { if (agent.status === "running") write(d); }}
          />
        </div>
        {showInput && (
          <TerminalInput
            status={agent.status}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
