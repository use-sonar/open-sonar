import { useState, useRef, useEffect } from "react";

const font = "Menlo, Monaco, 'SF Mono', monospace";

export function AgentHeader({
  id,
  status = "idle",
  name,
  cost = 0,
  duration = 0,
  model,
  dir,
  tokens = 0,
  messages = 0,
  onRename,
  onClose,
}: {
  id: string;
  status?: "idle" | "running" | "completed" | "error";
  name?: string;
  cost?: number;
  duration?: number;
  model?: string;
  dir?: string;
  tokens?: number;
  messages?: number;
  onRename?: (name: string) => void;
  onClose?: () => void;
}) {
  const num = id.split("-")[1];
  const label = name || `Agent ${num}`;
  const dotColor = status === "running" ? "#32d74b" : status === "error" ? "#ff453a" : "#48484a";
  const isActive = status === "running";

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditValue(label); }, [label]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  const commitEdit = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) onRename?.(trimmed);
    else setEditValue(label);
  };

  const fmtCost = (c: number) => c < 0.01 ? `$${c.toFixed(4)}` : c < 1 ? `$${c.toFixed(3)}` : `$${c.toFixed(2)}`;
  const fmtTokens = (t: number) => t >= 1_000_000 ? `${(t / 1_000_000).toFixed(1)}M` : t >= 1_000 ? `${(t / 1_000).toFixed(1)}k` : `${t}`;
  const fmtDuration = (ms: number) => {
    const s = Math.floor(ms / 1000); const m = Math.floor(s / 60);
    if (m > 0) return `${m}m${s % 60}s`;
    return `${s}s`;
  };

  const meta = [
    model,
    dir,
    `${fmtTokens(tokens)} tokens`,
    `${messages} msgs`,
  ].filter(Boolean);

  return (
    <div style={{ padding: "8px 12px 6px 12px", fontFamily: font, flexShrink: 0 }}>
      {/* Row 1 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") { setEditValue(label); setEditing(false); } }}
            style={{ fontSize: 13, fontWeight: 600, fontFamily: font, color: "#d1d1d6", background: "transparent", border: "none", borderBottom: "1px solid #48484a", outline: "none", padding: 0, width: "40%" }}
          />
        ) : (
          <span onClick={() => setEditing(true)} style={{ fontSize: 13, fontWeight: 600, color: "#d1d1d6", cursor: "text" }} title="Click to rename">
            {label}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#9898a0" }}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCost(cost)}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtDuration(duration)}</span>
          <span
            style={{
              width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0,
              animation: isActive ? "pulse-dot 2s ease-in-out infinite" : undefined,
            }}
          />
          {onClose && status !== "running" && (
            <span
              onClick={onClose}
              style={{ cursor: "pointer", color: "#48484a", fontSize: 15, lineHeight: 1, marginLeft: 2 }}
              title="Close agent"
              onMouseEnter={(e) => { e.currentTarget.style.color = "#9898a0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#48484a"; }}
            >
              ×
            </span>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ fontSize: 13, color: "#636366", marginTop: 3 }}>
        {meta.join(" · ")}
      </div>
    </div>
  );
}
