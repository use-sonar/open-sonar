# Sonar

**Mission control for Claude Code.**

A native macOS app to monitor your Claude Code agents in real-time. See what every agent costs, track token usage across sessions, and analyze your spending with charts and history.

## Features

**Terminals**
- Real PTY shell in each column — type `claude` and go
- Multi-agent side by side with `+ Agent`
- Live cost/token counters in the header
- Auto-detect Claude Code sessions from `~/.claude/`
- Editable agent names (click to rename)

**History**
- Browse all past sessions with cost, duration, model, tokens
- Import full history from `~/.claude/projects/`
- Click any session to see the message timeline with per-message cost
- Token breakdown: input / output / cache-read / cache-creation
- Export to CSV

**Analytics**
- Daily/weekly/monthly cost charts (Recharts)
- Model comparison: Sonnet vs Opus cost and token efficiency
- Energy estimation: Wh and CO₂ based on Luccioni et al. (2023)
- KPI cards: total cost, tokens, sessions, energy

**Settings**
- Custom pricing per model
- Default working directory
- Retention period

## Install

```bash
brew tap use-sonar/tap
brew install --cask open-sonar
```

Or build from source:

```bash
git clone https://github.com/use-sonar/open-sonar.git
cd open-sonar
npm install
npx tauri dev
```

**Prerequisites:** [Rust](https://rustup.rs/) 1.77+, [Node.js](https://nodejs.org/) 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed.

## How It Works

Sonar runs a real terminal (PTY) in each column. When you type `claude`, Sonar watches `~/.claude/projects/*.jsonl` for token usage and calculates cost in real-time. Zero invasive — it only reads data Claude Code already writes.

## Stack

| Layer | Technology |
|-------|-----------|
| App | Tauri v2 (Rust + WebView) |
| Terminal | xterm.js + portable-pty |
| Watcher | notify (Rust) — `~/.claude/projects/*.jsonl` |
| Charts | Recharts |
| Storage | SQLite (rusqlite) |
| Frontend | React + TypeScript + Vite |

## Roadmap

- **v0.1** — Multi-terminal, live cost tracking, auto-detect sessions ✓
- **v0.2** — History, analytics, model comparison, energy estimation, settings, CSV export ✓
- **v0.3** — Smart loop detection, budgets, agent templates, queue management, auto-update

## License

MIT — [Sonar](https://github.com/use-sonar)
