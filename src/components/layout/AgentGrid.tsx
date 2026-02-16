import { useAgentStore } from "../../stores/agentStore";
import { AgentColumn } from "../agent/AgentColumn";
import { AddAgentButton } from "../agent/AddAgentButton";

export function AgentGrid() {
  const agents = useAgentStore((s) => s.agents);

  return (
    <div className="flex flex-1 min-h-0">
      {agents.map((agent, i) => (
        <div key={agent.id} className={`flex-1 min-w-[400px] ${i > 0 ? "border-l border-sonar-border" : ""}`}>
          <AgentColumn agentId={agent.id} />
        </div>
      ))}
      <AddAgentButton />
    </div>
  );
}
