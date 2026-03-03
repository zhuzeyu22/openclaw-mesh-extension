/**
 * OpenClaw Self-Evolving Agent Mesh Extension
 *
 * 为 OpenClaw 提供自我进化的多智能体网格能力
 *
 * @module openclaw-mesh
 */

// 插件导出 - 尝试兼容不同版本的 OpenClaw
export { meshPlugin } from './plugin.js';
export { plugin as seamPlugin, createPlugin } from './plugin-adapter.js';

// 默认导出 - 兼容 2026.2.26 的模块加载方式
export { plugin as default } from './plugin-adapter.js';
export { SelfEvolvingMesh } from './mesh.js';
export { EvolutionPlanner, type HistoricalEvolution } from './evolution-planner.js';
export { TechAwareness } from './tech-awareness.js';
export { ProactiveExplorer } from './proactive-explorer.js';
export { generateId, sleep, createResolvablePromise, countOccurrences, limitArraySize } from './utils.js';
export type { MeshConfig, MeshStatus, AgentType, EvolutionPlan, EvolutionStrategy } from './types.js';
export type { TechTrend, CapabilityGap } from './tech-awareness.js';
export type { ExplorationOpportunity, Experiment } from './proactive-explorer.js';
