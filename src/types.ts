/**
 * SEAM (Self-Evolving Agent Mesh) 类型定义
 */

export type AgentType =
  | 'orchestrator'
  | 'researcher'
  | 'executor'
  | 'validator'
  | 'evolver';

export interface AgentDNA {
  id: string;
  generation: number;
  parentIds: string[];
  createdAt: Date;
  capabilities: Capability[];
  behavior: BehaviorGene;
  fitness?: FitnessScore;
}

export interface Capability {
  name: string;
  level: number;
  description: string;
}

export interface BehaviorGene {
  promptTemplate: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
}

export interface FitnessScore {
  successRate: number;
  avgResponseTime: number;
  collaborationScore: number;
  overall: number;
}

export interface MeshConfig {
  genesisAgents: GenesisConfig[];
  evolution: EvolutionConfig;
  autoStart?: boolean;
  /**
   * 是否拦截自然语言消息
   * - true: 自动拦截包含特定关键词的消息（可能与其他 agent 冲突）
   * - false: 只响应显式调用（@mesh、@seam、@网格）
   * @default false
   */
  interceptMessages?: boolean;
}

export interface GenesisConfig {
  type: AgentType;
  count: number;
}

export interface EvolutionConfig {
  enabled: boolean;
  intervalMinutes: number;
  selectionPressure: number;
  mutationRate: number;
}

export interface MeshStatus {
  isRunning: boolean;
  agentCount: number;
  agentsByType: Record<AgentType, number>;
  queueLength: number;
  generation: number;
  lastEvolutionAt?: Date;
}

export interface Task {
  id: string;
  description: string;
  complexity: 'simple' | 'medium' | 'complex';
  submitter: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output: string;
  executedBy: string;
  durationMs: number;
}

export interface MeshMessage {
  id: string;
  type: 'task' | 'result' | 'evolution' | 'heartbeat';
  sender: string;
  receiver: string | 'broadcast';
  payload: unknown;
  timestamp: number;
}

// Evolution Planner Types
export interface EvolutionStrategy {
  name: string;
  target: 'spawn' | 'mutate' | 'merge' | 'rebalance' | 'retire';
  agentType?: AgentType;
  priority: number;
  expectedImpact: {
    metric: string;
    improvement: number;
  };
  reasoning: string;
  parameters: Record<string, unknown>;
}

export interface EvolutionPlan {
  id: string;
  createdAt: number;
  triggers: string[];
  bottlenecks: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedAgents: AgentType[];
    metrics: Record<string, number>;
  }>;
  strategies: EvolutionStrategy[];
  expectedOutcome: {
    successRate?: number;
    responseTime?: number;
    capacity?: number;
  };
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
}
