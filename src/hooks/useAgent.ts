import { invoke } from "@tauri-apps/api/core";
import { useAgentStore } from "../stores/agentStore";

export function useAgent(agentId: string) {
  const { updateAgent, startAgent, stopAgent } = useAgentStore();

  const spawn = async (task: string, workingDir: string) => {
    startAgent(agentId, task, workingDir);
    try {
      await invoke("spawn_agent", {
        agentId,
        task,
        workingDir,
      });
    } catch (err) {
      updateAgent(agentId, { status: "error" });
      console.error("Failed to spawn agent:", err);
    }
  };

  const kill = async () => {
    try {
      await invoke("kill_agent", { agentId });
      stopAgent(agentId);
    } catch (err) {
      console.error("Failed to kill agent:", err);
    }
  };

  const write = async (data: string) => {
    try {
      await invoke("write_to_agent", { agentId, data });
    } catch (err) {
      console.error("Failed to write to agent:", err);
    }
  };

  const resize = async (rows: number, cols: number) => {
    try {
      await invoke("resize_agent", { agentId, rows, cols });
    } catch (err) {
      console.error("Failed to resize agent:", err);
    }
  };

  return { spawn, kill, write, resize };
}
