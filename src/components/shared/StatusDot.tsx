import type { AgentStatus } from "../../stores/agentStore";

const STATUS: Record<AgentStatus, { color: string; label: string }> = {
  idle: { color: "bg-sonar-text-muted", label: "Idle" },
  running: { color: "bg-sonar-accent", label: "Running" },
  warning: { color: "bg-sonar-warning", label: "Loop detected" },
  error: { color: "bg-sonar-danger", label: "Error" },
  completed: { color: "bg-sonar-text-muted", label: "Done" },
};

export function StatusDot({ status }: { status: AgentStatus }) {
  const { color, label } = STATUS[status];
  const isActive = status === "running" || status === "warning";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${color}`}
        style={isActive ? { animation: "pulse-dot 2s ease-in-out infinite" } : undefined}
      />
      <span className="text-xs text-sonar-text-secondary">{label}</span>
    </div>
  );
}
