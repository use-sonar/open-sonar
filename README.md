# Sonar

**Mission control for Claude Code.**

A native macOS dashboard to monitor your Claude Code agents in real-time. See what every agent is doing, how much it costs, and kill runaway loops before they burn your budget.

## Features

- **Real terminal** — Each agent column runs a native PTY shell. Type `claude` and go.
- **Live cost tracking** — Token usage and cost update in real-time as Claude works, parsed from `~/.claude/` session data.
- **Multi-agent** — Run multiple agents side by side. Click `+ Agent` to add columns.
- **Auto-detect** — Sonar detects when you launch `claude` and updates the agent name, status, and metrics automatically.
- **Editable names** — Click any agent name to rename it.
- **Zero invasive** — Sonar only reads the data Claude Code already writes. No proxies, no patches.

## Stack

| Layer | Technology |
|-------|-----------|
| App | Tauri v2 (Rust + WebView) |
| Terminal | xterm.js + portable-pty |
| Watcher | notify (Rust) — watches `~/.claude/projects/*.jsonl` |
| Storage | SQLite (rusqlite) |
| Frontend | React + TypeScript + Vite |

## Getting Started

```bash
git clone https://github.com/use-sonar/open-sonar.git
cd open-sonar
npm install
npx tauri dev
```

**Prerequisites:** [Rust](https://rustup.rs/) 1.77+, [Node.js](https://nodejs.org/) 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed.

## How It Works

```
You open Sonar → a real shell spawns in each column
You type `claude "your task"` → Sonar detects the session
Claude works → JSONL watcher parses tokens/cost in real-time
Header + footer update live → you see exactly what you're spending
```

## Roadmap

- **v0.1** — Multi-terminal, live cost tracking, auto-detect Claude sessions ✓
- **v0.2** — Session history, cost charts, model comparison, energy estimation
- **v0.3** — Smart loop detection, budgets, efficiency scores, agent templates

## License

MIT — [Sonar](https://github.com/use-sonar)
