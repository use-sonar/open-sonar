import { useAgentStore } from "../../stores/agentStore";
import { formatCost } from "../../lib/cost";

export function Toolbar() {
  const agents = useAgentStore((s) => s.agents);
  const totalCost = agents.reduce((sum, a) => sum + a.totalCost, 0);
  const runningCount = agents.filter((a) => a.status === "running").length;

  return (
    <div className="flex items-center justify-between h-11 px-5 bg-sonar-surface border-b border-sonar-border">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-md bg-sonar-accent/15 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-sonar-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-sonar-text">Sonar</span>
        {runningCount > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sonar-accent" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
            <span className="text-xs text-sonar-text-secondary">{runningCount} running</span>
          </div>
        )}
      </div>
      <div className="text-xs text-sonar-text-muted tabular-nums">
        Session {formatCost(totalCost)}
      </div>
    </div>
  );
}
