import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";

interface PtyOutput { agent_id: string; data: string; }

export function TerminalView({
  agentId,
  onResize,
  onData,
}: {
  agentId: string;
  onResize?: (rows: number, cols: number) => void;
  onData?: (data: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  const doFit = useCallback(() => {
    if (fitRef.current && termRef.current) {
      try { fitRef.current.fit(); onResize?.(termRef.current.rows, termRef.current.cols); } catch {}
    }
  }, [onResize]);

  useEffect(() => {
    if (!ref.current) return;

    const term = new XTerminal({
      theme: {
        background: "#0c0c0e",
        foreground: "#b0b0b8",
        cursor: "#ececef",
        cursorAccent: "#0c0c0e",
        selectionBackground: "rgba(255,255,255,0.07)",
        black: "#0c0c0e", red: "#ff453a", green: "#34d469", yellow: "#ffd60a",
        blue: "#0a84ff", magenta: "#bf5af2", cyan: "#5ac8fa", white: "#b0b0b8",
        brightBlack: "#5c5c64", brightRed: "#ff6961", brightGreen: "#4ade80",
        brightYellow: "#ffe066", brightBlue: "#409cff", brightMagenta: "#da8aff",
        brightCyan: "#70d7ff", brightWhite: "#ececef",
      },
      fontFamily: "SF Mono, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      cursorWidth: 1,
      scrollback: 15000,
      allowProposedApi: true,
      drawBoldTextInBrightColors: false,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);
    setTimeout(() => { fit.fit(); onResize?.(term.rows, term.cols); }, 50);
    term.onData((d) => onData?.(d));

    termRef.current = term;
    fitRef.current = fit;

    const ro = new ResizeObserver(doFit);
    ro.observe(ref.current);

    let off: (() => void) | null = null;
    listen<PtyOutput>("pty-output", (e) => {
      if (e.payload.agent_id === agentId) term.write(e.payload.data);
    }).then(fn => { off = fn; });

    return () => { off?.(); ro.disconnect(); term.dispose(); };
  }, [agentId]);

  return <div ref={ref} className="h-full w-full bg-sonar-bg" />;
}
