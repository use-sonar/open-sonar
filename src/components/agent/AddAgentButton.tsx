import { useAgentStore } from "../../stores/agentStore";

export function AddAgentButton() {
  const addAgent = useAgentStore((s) => s.addAgent);

  return (
    <div className="flex items-center border-l border-sonar-border">
      <button
        onClick={addAgent}
        className="flex items-center justify-center w-12 h-full hover:bg-sonar-surface-hover transition-colors group"
        title="Add agent"
      >
        <svg className="w-5 h-5 text-sonar-text-muted group-hover:text-sonar-text-secondary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  );
}
