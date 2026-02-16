import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAgentStore } from "../stores/agentStore";

interface SessionUpdate {
  agent_id: string;
  session_id: string;
  model: string | null;
  total_tokens: number;
  total_cost: number;
  message_count: number;
  tool_calls: string[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
}

export function useStats() {
  const { updateAgent } = useAgentStore();
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const setup = async () => {
      unlistenRef.current = await listen<SessionUpdate>(
        "session-update",
        (event) => {
          const data = event.payload;
          const agent = useAgentStore
            .getState()
            .agents.find((a) => a.id === data.agent_id);

          if (agent) {
            const newCost = agent.totalCost + data.total_cost;
            const elapsed = Date.now() - agent.startedAt;
            const burnRate = elapsed > 0 ? newCost / (elapsed / 1000) : 0;

            updateAgent(data.agent_id, {
              model: data.model || agent.model,
              totalCost: newCost,
              totalTokens: agent.totalTokens + data.total_tokens,
              inputTokens: agent.inputTokens + data.usage.input_tokens,
              outputTokens: agent.outputTokens + data.usage.output_tokens,
              cacheReadTokens:
                agent.cacheReadTokens + data.usage.cache_read_input_tokens,
              cacheCreationTokens:
                agent.cacheCreationTokens +
                data.usage.cache_creation_input_tokens,
              messageCount: agent.messageCount + data.message_count,
              toolCalls: [...agent.toolCalls, ...data.tool_calls],
              duration: elapsed,
              burnRate,
            });
          }
        }
      );
    };

    setup();

    return () => {
      unlistenRef.current?.();
    };
  }, []);
}
