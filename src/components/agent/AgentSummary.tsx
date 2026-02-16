import type { AgentSession } from "../../stores/agentStore";

export function AgentSummary({ agent }: { agent: AgentSession }) {
  const tools = [...new Set(agent.toolCalls)];
  const counts = agent.toolCalls.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {} as Record<string, number>);

  if (tools.length === 0 && !agent.task) return null;

  return (
    <div className="space-y-1.5">
      {agent.task && (
        <p className="text-xs text-sonar-text-secondary leading-relaxed">{agent.task}</p>
      )}
      {tools.length > 0 && (
        <p className="text-xs text-sonar-text-muted">
          {tools.slice(0, 6).map(t => counts[t] > 1 ? `${t} ×${counts[t]}` : t).join(" · ")}
          {tools.length > 6 && ` +${tools.length - 6}`}
        </p>
      )}
    </div>
  );
}
