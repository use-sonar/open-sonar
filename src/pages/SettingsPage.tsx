import { useState } from "react";

const font = "Menlo, Monaco, 'SF Mono', monospace";

interface Settings {
  sonnetInput: number; sonnetOutput: number;
  opusInput: number; opusOutput: number;
  haikuInput: number; haikuOutput: number;
  defaultDir: string;
  retentionDays: number;
}

const DEFAULT_SETTINGS: Settings = {
  sonnetInput: 3, sonnetOutput: 15,
  opusInput: 15, opusOutput: 75,
  haikuInput: 0.25, haikuOutput: 1.25,
  defaultDir: "~",
  retentionDays: 90,
};

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem("sonar-settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const update = (key: keyof Settings, value: number | string) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem("sonar-settings", JSON.stringify(next));
  };

  return (
    <div style={{ padding: 20, fontFamily: font, fontSize: 13, color: "#d1d1d6", overflow: "auto", height: "100%", maxWidth: 600 }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Settings</div>

      <Section title="Pricing (per 1M tokens)">
        <PriceRow label="Sonnet Input" value={settings.sonnetInput} onChange={(v) => update("sonnetInput", v)} />
        <PriceRow label="Sonnet Output" value={settings.sonnetOutput} onChange={(v) => update("sonnetOutput", v)} />
        <PriceRow label="Opus Input" value={settings.opusInput} onChange={(v) => update("opusInput", v)} />
        <PriceRow label="Opus Output" value={settings.opusOutput} onChange={(v) => update("opusOutput", v)} />
        <PriceRow label="Haiku Input" value={settings.haikuInput} onChange={(v) => update("haikuInput", v)} />
        <PriceRow label="Haiku Output" value={settings.haikuOutput} onChange={(v) => update("haikuOutput", v)} />
      </Section>

      <Section title="General">
        <Row label="Default directory">
          <input value={settings.defaultDir} onChange={(e) => update("defaultDir", e.target.value)}
            style={{ background: "#1e1e1e", border: "1px solid #2a2a2e", borderRadius: 6, color: "#d1d1d6", fontSize: 13, fontFamily: font, padding: "4px 8px", width: 200, outline: "none" }} />
        </Row>
        <Row label="Retention (days)">
          <input type="number" value={settings.retentionDays} onChange={(e) => update("retentionDays", parseInt(e.target.value) || 90)}
            style={{ background: "#1e1e1e", border: "1px solid #2a2a2e", borderRadius: 6, color: "#d1d1d6", fontSize: 13, fontFamily: font, padding: "4px 8px", width: 80, outline: "none" }} />
        </Row>
      </Section>

      <Section title="About">
        <div style={{ color: "#636366", lineHeight: 1.6 }}>
          Sonar v0.2.0<br />
          Claude Code Agent Dashboard<br />
          MIT License · github.com/use-sonar/open-sonar
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: "#636366", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      <div style={{ background: "#1e1e1e", borderRadius: 8, padding: 12 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #222222" }}>
      <span style={{ color: "#9898a0" }}>{label}</span>
      {children}
    </div>
  );
}

function PriceRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Row label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ color: "#636366" }}>$</span>
        <input type="number" step="0.01" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{ background: "transparent", border: "1px solid #2a2a2e", borderRadius: 4, color: "#d1d1d6", fontSize: 13, fontFamily: "Menlo, monospace", padding: "2px 6px", width: 70, outline: "none", textAlign: "right" }} />
      </div>
    </Row>
  );
}
