import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import type { Terminal } from "@xterm/xterm";

interface PtyOutput {
  agent_id: string;
  data: string;
}

interface PtyExit {
  agent_id: string;
  exit_code: number | null;
}

export function usePty(
  agentId: string,
  terminalRef: React.MutableRefObject<Terminal | null>,
  onExit?: () => void
) {
  const unlistenOutput = useRef<(() => void) | null>(null);
  const unlistenExit = useRef<(() => void) | null>(null);

  useEffect(() => {
    const setupListeners = async () => {
      unlistenOutput.current = await listen<PtyOutput>(
        "pty-output",
        (event) => {
          if (event.payload.agent_id === agentId && terminalRef.current) {
            terminalRef.current.write(event.payload.data);
          }
        }
      );

      unlistenExit.current = await listen<PtyExit>("pty-exit", (event) => {
        if (event.payload.agent_id === agentId) {
          onExit?.();
        }
      });
    };

    setupListeners();

    return () => {
      unlistenOutput.current?.();
      unlistenExit.current?.();
    };
  }, [agentId, onExit]);

  return { terminalRef };
}
