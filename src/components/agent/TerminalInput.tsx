import { useState, useRef, useCallback } from "react";

export function TerminalInput({
  status,
  onSubmit,
}: {
  status: "idle" | "running" | "warning" | "error" | "completed";
  onSubmit: (task: string, workingDir: string) => void;
}) {
  const [task, setTask] = useState("");
  const [dir, setDir] = useState("~");
  const [showDir, setShowDir] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(() => {
    if (!task.trim()) return;
    onSubmit(task.trim(), dir || "~");
    setTask("");
  }, [task, dir, onSubmit]);

  return (
    <div className="shrink-0 border-t border-sonar-border/50">
      {showDir && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-sonar-border/30" style={{ fontFamily: "SF Mono, Menlo, Monaco, monospace" }}>
          <span className="text-xs text-sonar-text-muted select-none">dir</span>
          <input
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            className="flex-1 bg-transparent text-xs text-sonar-text-secondary outline-none"
            style={{ fontFamily: "inherit" }}
            placeholder="~/projects/my-project"
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ fontFamily: "SF Mono, Menlo, Monaco, monospace" }}>
        <button
          onClick={() => setShowDir(!showDir)}
          className="text-sonar-text-muted hover:text-sonar-text-secondary transition-colors select-none"
          title="Set working directory"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </button>
        <span className="text-sonar-accent text-sm select-none">›</span>
        <input
          ref={inputRef}
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className="flex-1 bg-transparent text-sm text-sonar-text outline-none placeholder:text-sonar-text-muted"
          style={{ fontFamily: "inherit" }}
          placeholder={status === "completed" ? "Start a new task..." : "Describe a task..."}
          autoFocus
        />
        {task.trim() && (
          <button
            onClick={submit}
            className="text-xs text-sonar-accent hover:text-sonar-accent/80 transition-colors select-none"
          >
            run ↵
          </button>
        )}
      </div>
    </div>
  );
}
