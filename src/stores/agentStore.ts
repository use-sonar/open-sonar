import { create } from "zustand";

export type AgentStatus =
  | "idle"
  | "running"
  | "warning"
  | "error"
  | "completed";

export interface AgentSession {
  id: string;
  task: string;
  workingDir: string;
  status: AgentStatus;
  model: string;
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  messageCount: number;
  toolCalls: string[];
  startedAt: number;
  duration: number;
  burnRate: number;
  isLooping: boolean;
  estimatedSavings: number;
}

function createAgent(id: string): AgentSession {
  return {
    id,
    task: "",
    workingDir: "",
    status: "idle",
    model: "unknown",
    totalCost: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    messageCount: 0,
    toolCalls: [],
    startedAt: 0,
    duration: 0,
    burnRate: 0,
    isLooping: false,
    estimatedSavings: 0,
  };
}

interface AgentStore {
  agents: AgentSession[];
  globalCostToday: number;

  addAgent: () => string;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, updates: Partial<AgentSession>) => void;
  startAgent: (id: string, task: string, workingDir: string) => void;
  stopAgent: (id: string) => void;
  setGlobalCostToday: (cost: number) => void;
  getRunningCount: () => number;
  getTotalCost: () => number;
  getTotalTokens: () => number;
}

let agentCounter = 0;

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [createAgent(`agent-${++agentCounter}`)],
  globalCostToday: 0,

  addAgent: () => {
    const id = `agent-${++agentCounter}`;
    set((state) => ({
      agents: [...state.agents, createAgent(id)],
    }));
    return id;
  },

  removeAgent: (id) => {
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
    }));
  },

  updateAgent: (id, updates) => {
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  },

  startAgent: (id, task, workingDir) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id
          ? {
              ...a,
              task,
              workingDir,
              status: "running" as AgentStatus,
              startedAt: Date.now(),
              totalCost: 0,
              totalTokens: 0,
              messageCount: 0,
              toolCalls: [],
              duration: 0,
              burnRate: 0,
              isLooping: false,
              estimatedSavings: 0,
            }
          : a
      ),
    }));
  },

  stopAgent: (id) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, status: "completed" as AgentStatus } : a
      ),
    }));
  },

  setGlobalCostToday: (cost) => set({ globalCostToday: cost }),

  getRunningCount: () => get().agents.filter((a) => a.status === "running").length,

  getTotalCost: () => get().agents.reduce((sum, a) => sum + a.totalCost, 0),

  getTotalTokens: () => get().agents.reduce((sum, a) => sum + a.totalTokens, 0),
}));
