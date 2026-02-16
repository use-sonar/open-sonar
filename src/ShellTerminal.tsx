import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const isTauri = !!(window as any).__TAURI_INTERNALS__;

async function tauriInvoke(cmd: string, args?: any) {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke(cmd, args);
}

async function tauriListen(event: string, handler: (e: any) => void) {
  if (!isTauri) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen(event, handler);
}

interface PtyOutput {
  agent_id: string;
  data: string;
}

const spawnedIds = new Set<string>();

export function ShellTerminal({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || spawnedIds.has(id)) return;
    spawnedIds.add(id);

    const container = ref.current;

    const term = new Terminal({
      theme: {
        background: "#171717",
        foreground: "#d1d1d6",
        cursor: "#d1d1d6",
        cursorAccent: "#171717",
        selectionBackground: "rgba(255,255,255,0.10)",
        black: "#171717",
        red: "#ff453a",
        green: "#32d74b",
        yellow: "#ffd60a",
        blue: "#0a84ff",
        magenta: "#bf5af2",
        cyan: "#64d2ff",
        white: "#d1d1d6",
        brightBlack: "#48484a",
        brightRed: "#ff6961",
        brightGreen: "#4ade80",
        brightYellow: "#ffd426",
        brightBlue: "#409cff",
        brightMagenta: "#da8aff",
        brightCyan: "#70d7ff",
        brightWhite: "#f2f2f7",
      },
      fontFamily: "Menlo, Monaco, 'SF Mono', monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 10000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);

    const doFit = () => { try { fit.fit(); } catch {} };
    doFit();
    setTimeout(doFit, 100);

    const ro = new ResizeObserver(() => {
      doFit();
      if (term.rows && term.cols) {
        tauriInvoke("resize_agent", { agentId: id, rows: term.rows, cols: term.cols });
      }
    });
    ro.observe(container);

    let unlisten: (() => void) | null = null;

    const start = async () => {
      if (isTauri) {
        const off = await tauriListen("pty-output", (e: any) => {
          if (e.payload.agent_id === id) term.write(e.payload.data);
        });
        unlisten = off as (() => void);

        doFit();

        const homeDir = await tauriInvoke("get_home_dir") as string;
        await tauriInvoke("register_agent_dir", { agentId: id, workingDir: homeDir });
        await tauriInvoke("spawn_shell", {
          agentId: id,
          workingDir: homeDir,
          rows: term.rows,
          cols: term.cols,
        });
      } else {
        term.writeln("\x1b[32mSonar\x1b[0m — browser preview");
        term.writeln("Run with \x1b[36mnpx tauri dev\x1b[0m for live terminal.");
        term.writeln("");
        term.write("\x1b[90m$ \x1b[0m");

        term.onData((data) => {
          if (data === "\r") {
            term.writeln("");
            term.write("\x1b[90m$ \x1b[0m");
          } else if (data === "\x7f") {
            term.write("\b \b");
          } else {
            term.write(data);
          }
        });
      }
    };

    if (isTauri) {
      term.onData((data) => {
        tauriInvoke("write_to_agent", { agentId: id, data });
      });
    }

    start();

    return () => {
      unlisten?.();
      ro.disconnect();
      tauriInvoke("kill_agent", { agentId: id });
      term.dispose();
      spawnedIds.delete(id);
    };
  }, [id]);

  return <div ref={ref} style={{ width: "100%", height: "100%", background: "#171717", padding: "10px 12px 0 12px" }} />;
}
