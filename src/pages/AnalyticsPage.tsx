import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from "recharts";

const isTauri = !!(window as any).__TAURI_INTERNALS__;
const font = "Menlo, Monaco, 'SF Mono', monospace";

interface DailyCost { date: string; cost: number; tokens: number; sessions: number; }
interface ModelStats { model: string; total_cost: number; total_tokens: number; session_count: number; avg_cost_per_session: number; avg_tokens_per_session: number; }

const fmtCost = (c: number) => c < 0.01 ? `$${c.toFixed(4)}` : c < 1 ? `$${c.toFixed(3)}` : `$${c.toFixed(2)}`;
const fmtTokens = (t: number) => t >= 1_000_000 ? `${(t / 1_000_000).toFixed(1)}M` : t >= 1_000 ? `${(t / 1_000).toFixed(1)}k` : `${t}`;

const ENERGY_PER_TOKEN: Record<string, number> = {
  opus: 0.004,
  sonnet: 0.001,
  haiku: 0.0005,
};
const CO2_PER_WH = 0.000385; // kg CO2 per Wh (US average grid)

const MODEL_COLORS: Record<string, string> = {
  opus: "#bf5af2",
  sonnet: "#0a84ff",
  haiku: "#32d74b",
};

function getModelKey(model: string): string {
  if (model.includes("opus")) return "opus";
  if (model.includes("haiku")) return "haiku";
  return "sonnet";
}

export function AnalyticsPage() {
  const [daily, setDaily] = useState<DailyCost[]>([]);
  const [models, setModels] = useState<ModelStats[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!isTauri) return;
    const load = async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const [d, m] = await Promise.all([
        invoke("get_daily_costs", { days }) as Promise<DailyCost[]>,
        invoke("get_model_stats") as Promise<ModelStats[]>,
      ]);
      setDaily(d);
      setModels(m);
    };
    load();
  }, [days]);

  const totalCost = daily.reduce((s, d) => s + d.cost, 0);
  const totalTokens = daily.reduce((s, d) => s + d.tokens, 0);
  const totalSessions = daily.reduce((s, d) => s + d.sessions, 0);

  const totalEnergy = models.reduce((s, m) => {
    const key = getModelKey(m.model);
    return s + (m.total_tokens * (ENERGY_PER_TOKEN[key] || 0.001)) / 1000;
  }, 0);
  const totalCO2 = totalEnergy * CO2_PER_WH * 1000;

  return (
    <div style={{ padding: 20, fontFamily: font, fontSize: 13, color: "#d1d1d6", overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Analytics</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} style={{
              background: days === d ? "#2a2a2e" : "none", border: "1px solid #2a2a2e",
              borderRadius: 6, color: days === d ? "#d1d1d6" : "#636366",
              fontSize: 11, fontFamily: font, padding: "3px 8px", cursor: "pointer",
            }}>{d}d</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <KPICard label="Total Cost" value={fmtCost(totalCost)} />
        <KPICard label="Tokens" value={fmtTokens(totalTokens)} />
        <KPICard label="Sessions" value={`${totalSessions}`} />
        <KPICard label="Energy" value={`${totalEnergy.toFixed(2)} Wh`} sub={`${totalCO2.toFixed(1)}g CO₂`} />
      </div>

      {/* Cost chart */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: "#636366", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Daily Cost</div>
        <div style={{ height: 200, background: "#1e1e1e", borderRadius: 8, padding: "12px 8px" }}>
          <ResponsiveContainer>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#32d74b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#32d74b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#48484a", fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
              <YAxis tick={{ fill: "#48484a", fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(2)}`} width={50} />
              <Tooltip contentStyle={{ background: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: 6, fontSize: 12, fontFamily: font }}
                labelFormatter={(d) => new Date(d).toLocaleDateString()} formatter={(v: any) => [fmtCost(v ?? 0), "Cost"]} />
              <Area type="monotone" dataKey="cost" stroke="#32d74b" fill="url(#costGrad)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model comparison */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: "#636366", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Model Comparison</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#1e1e1e", borderRadius: 8, padding: 16 }}>
            <div style={{ color: "#48484a", fontSize: 11, marginBottom: 12 }}>Cost by Model</div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer>
                <BarChart data={models}>
                  <XAxis dataKey="model" tick={{ fill: "#636366", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={(m) => m.includes("opus") ? "Opus" : m.includes("sonnet") ? "Sonnet" : "Haiku"} />
                  <YAxis tick={{ fill: "#48484a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} width={50} />
                  <Bar dataKey="total_cost" radius={[4, 4, 0, 0]}>
                    {models.map((m, i) => <Cell key={i} fill={MODEL_COLORS[getModelKey(m.model)] || "#636366"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: "#1e1e1e", borderRadius: 8, padding: 16 }}>
            <div style={{ color: "#48484a", fontSize: 11, marginBottom: 12 }}>Avg Cost / Session</div>
            {models.map((m) => (
              <div key={m.model} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #222222" }}>
                <span style={{ color: MODEL_COLORS[getModelKey(m.model)] || "#636366" }}>
                  {m.model.includes("opus") ? "Opus" : m.model.includes("sonnet") ? "Sonnet" : "Haiku"}
                </span>
                <div style={{ color: "#9898a0", fontVariantNumeric: "tabular-nums" }}>
                  {fmtCost(m.avg_cost_per_session)} · {fmtTokens(m.avg_tokens_per_session)} tok/sess
                </div>
              </div>
            ))}
            {models.length === 0 && <div style={{ color: "#48484a" }}>No data yet</div>}
          </div>
        </div>
      </div>

      {/* Energy estimation */}
      <div>
        <div style={{ color: "#636366", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Energy Estimation</div>
        <div style={{ background: "#1e1e1e", borderRadius: 8, padding: 16, color: "#9898a0", fontSize: 12, lineHeight: 1.6 }}>
          Based on Luccioni et al. (2023) estimates for LLM inference energy consumption.
          <br />Opus ≈ 0.004 Wh/1K tokens · Sonnet ≈ 0.001 Wh/1K tokens · Haiku ≈ 0.0005 Wh/1K tokens
          <br />CO₂ calculated using US average grid intensity (385g CO₂/kWh).
          <div style={{ display: "flex", gap: 24, marginTop: 12, color: "#d1d1d6" }}>
            <span>Total energy: <strong>{totalEnergy.toFixed(3)} Wh</strong></span>
            <span>CO₂: <strong>{totalCO2.toFixed(2)}g</strong></span>
            <span>Equivalent: <strong>{(totalCO2 / 404).toFixed(4)} km driven</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#1e1e1e", borderRadius: 8, padding: "12px 16px" }}>
      <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ color: "#636366", fontSize: 11, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ color: "#48484a", fontSize: 10, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
