import { useAgentStore } from "../../stores/agentStore";
import { formatTokens, formatCost } from "../../lib/cost";

export function KPIBar() {
  const agents = useAgentStore((s) => s.agents);
  const totalCost = agents.reduce((s, a) => s + a.totalCost, 0);
  const totalTokens = agents.reduce((s, a) => s + a.totalTokens, 0);
  const running = agents.filter((a) => a.status === "running").length;
  const done = agents.filter((a) => a.status === "completed").length;

  return (
    <div className="flex items-center justify-center h-9 px-6 gap-6 border-t border-sonar-border bg-sonar-surface text-xs text-sonar-text-muted">
      <span>Cost <strong className="text-sonar-text-secondary ml-1">{formatCost(totalCost)}</strong></span>
      <span className="w-px h-3 bg-sonar-border" />
      <span>Tokens <strong className="text-sonar-text-secondary ml-1">{formatTokens(totalTokens)}</strong></span>
      <span className="w-px h-3 bg-sonar-border" />
      <span>Running <strong className={`ml-1 ${running > 0 ? "text-sonar-accent" : "text-sonar-text-secondary"}`}>{running}</strong></span>
      <span className="w-px h-3 bg-sonar-border" />
      <span>Done <strong className="text-sonar-text-secondary ml-1">{done}</strong></span>
      <span className="w-px h-3 bg-sonar-border" />
      <span>Agents <strong className="text-sonar-text-secondary ml-1">{agents.length}</strong></span>
    </div>
  );
}
