import type { AgentSession } from "../../stores/agentStore";
import { StatusDot } from "../shared/StatusDot";

export function AgentHeader({
  agent,
  canRemove,
  onRemove,
  onKill,
}: {
  agent: AgentSession;
  canRemove: boolean;
  onRemove: () => void;
  onKill: () => void;
}) {
  const num = agent.id.split("-")[1];
  const title = agent.task || `Agent ${num}`;
  const dir = agent.workingDir?.split("/").filter(Boolean).pop();
  const model = agent.model.includes("opus") ? "Opus" : agent.model.includes("sonnet") ? "Sonnet" : agent.model.includes("haiku") ? "Haiku" : null;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-sonar-text truncate">{title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <StatusDot status={agent.status} />
            {model && <span className="text-xs text-sonar-text-muted">· {model}</span>}
            {dir && agent.status !== "idle" && <span className="text-xs text-sonar-text-muted truncate">· {dir}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(agent.status === "running" || agent.status === "warning") && (
            <button onClick={onKill} className="px-2.5 py-1 rounded-md text-xs font-medium text-sonar-danger bg-sonar-danger-dim hover:bg-sonar-danger/20 transition-colors">
              Stop
            </button>
          )}
          {canRemove && (
            <button onClick={onRemove} className="p-1 rounded-md text-sonar-text-muted hover:text-sonar-text-secondary hover:bg-sonar-surface-hover transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
