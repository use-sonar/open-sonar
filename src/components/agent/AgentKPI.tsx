import { useState, useEffect } from "react";
import type { AgentSession } from "../../stores/agentStore";
import { formatTokens, formatDuration } from "../../lib/cost";
import { CostCounter } from "../shared/CostCounter";

export function AgentKPI({ agent }: { agent: AgentSession }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (agent.status !== "running") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [agent.status]);

  const elapsed = agent.status === "running" ? now - agent.startedAt : agent.duration;

  return (
    <div className="grid grid-cols-4 gap-px bg-sonar-border rounded-lg overflow-hidden">
      <Metric label="Cost">
        <CostCounter cost={agent.totalCost} burnRate={agent.burnRate} size="sm" />
      </Metric>
      <Metric label="Tokens" value={formatTokens(agent.totalTokens)} />
      <Metric label="Time" value={formatDuration(elapsed)} />
      <Metric label="Messages" value={`${agent.messageCount}`} />
    </div>
  );
}

function Metric({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="bg-sonar-surface px-3 py-2.5 text-center">
      <div className="text-sm font-semibold tabular-nums text-sonar-text-secondary">
        {children || value}
      </div>
      <div className="text-[10px] text-sonar-text-muted uppercase tracking-widest mt-0.5">
        {label}
      </div>
    </div>
  );
}
