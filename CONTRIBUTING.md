# Contributing to Sonar

Thanks for your interest in contributing to Sonar. This guide will help you get started.

## What is Sonar?

Sonar is a native macOS dashboard for monitoring Claude Code agents. It combines real terminals (PTY) with live cost tracking, session history, and analytics — all in one app built with Tauri v2, Rust, and React.

## Getting Started

```bash
# Prerequisites: Rust 1.77+, Node.js 18+
git clone https://github.com/use-sonar/open-sonar.git
cd open-sonar
npm install
npx tauri dev
```

## Project Structure

```
src-tauri/src/
  pty/manager.rs          — PTY lifecycle (spawn, kill, resize shells)
  collector/watcher.rs    — Watches ~/.claude/projects/*.jsonl in real-time
  collector/parser.rs     — Parses Claude Code JSONL session data
  collector/cost.rs       — Token cost calculation per model
  detection/loop_detector.rs — Detects repeated output patterns
  db/mod.rs               — SQLite schema and queries
  commands/agent.rs       — Tauri IPC: shell spawn, kill, resize
  commands/stats.rs       — Tauri IPC: sessions, analytics, import

src/
  App.tsx                 — Main app with tab navigation
  ShellTerminal.tsx       — xterm.js terminal connected to Rust PTY
  AgentHeader.tsx         — Agent name, status, cost, duration
  UpdateChecker.tsx       — Auto-update popup
  pages/
    TerminalsPage.tsx     — Multi-terminal columns view
    HistoryPage.tsx       — Session history table + detail view
    AnalyticsPage.tsx     — Cost charts, model comparison, energy
    SettingsPage.tsx      — Pricing, preferences
```

## How to Contribute

1. Check the [Issues](https://github.com/use-sonar/open-sonar/issues) page — look for `good first issue` labels
2. Fork the repo and create a branch
3. Make your changes
4. Test with `npx tauri dev`
5. Open a pull request

## Areas Where Help is Needed

- **Rust** — PTY improvements, performance, Windows support
- **Frontend** — UI polish, new visualizations, accessibility
- **Data** — Better JSONL parsing, more analytics
- **Platform** — Windows/Linux support, CI/CD, packaging
- **Design** — Icons, screenshots, GIF for README

## Code Style

- Rust: standard `cargo fmt`
- TypeScript: no framework CSS (inline styles matching the dark theme)
- Colors: `#171717` bg, `#d1d1d6` text, `#32d74b` green, `#636366` muted
- Font: Menlo/SF Mono 13px throughout

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
