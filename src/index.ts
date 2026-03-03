/**
 * OpenClaw Self-Evolving Agent Mesh Extension
 *
 * 为 OpenClaw 提供自我进化的多智能体网格能力
 *
 * @module openclaw-mesh
 */

export { meshPlugin } from './plugin.js';
export { SelfEvolvingMesh } from './mesh.js';
export { EvolutionPlanner, type HistoricalEvolution } from './evolution-planner.js';
export { TechAwareness } from './tech-awareness.js';
export { ProactiveExplorer } from './proactive-explorer.js';
export type { MeshConfig, MeshStatus, AgentType, EvolutionPlan, EvolutionStrategy } from './types.js';
export type { TechTrend, CapabilityGap } from './tech-awareness.js';
export type { ExplorationOpportunity, Experiment } from './proactive-explorer.js';
