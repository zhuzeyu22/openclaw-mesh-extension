/**
 * OpenClaw 插件适配器
 * 尝试兼容 2026.2.26 和 2026.3.0+ 版本
 */

import { SelfEvolvingMesh } from './mesh.js';
import type { MeshConfig } from './types.js';

const DEFAULT_CONFIG: MeshConfig = {
  genesisAgents: [
    { type: 'orchestrator', count: 1 },
    { type: 'researcher', count: 2 },
    { type: 'executor', count: 3 },
    { type: 'validator', count: 1 },
    { type: 'evolver', count: 1 },
  ],
  evolution: {
    enabled: true,
    intervalMinutes: 360,
    selectionPressure: 0.3,
    mutationRate: 0.2,
  },
  autoStart: true,
  interceptMessages: false,
};

/**
 * 尝试从各种可能的配置源读取配置
 */
function loadConfig(context?: any): MeshConfig {
  let userConfig: Partial<MeshConfig> = {};

  if (context) {
    // 2026.3.0+ 方式
    if (context.config?.get) {
      const seamConfig = context.config.get('seam') as Partial<MeshConfig>;
      const meshConfig = context.config.get('mesh') as Partial<MeshConfig>;
      userConfig = seamConfig || meshConfig || {};
    }

    // 2026.2.26 可能的方式 - 直接读取 context.seam 或 context.mesh
    if (context.seam) {
      userConfig = context.seam as Partial<MeshConfig>;
    } else if (context.mesh) {
      userConfig = context.mesh as Partial<MeshConfig>;
    }
  }

  return { ...DEFAULT_CONFIG, ...userConfig };
}

// AMD 类型声明
declare const define: any;

// 浏览器类型声明
declare const window: any;

/**
 * 创建插件实例
 * 适配不同版本的 OpenClaw 接口
 */
function createPlugin() {
  const mesh = new SelfEvolvingMesh(DEFAULT_CONFIG);
  let initialized = false;

  const plugin = {
    // 标准 Skill 属性
    name: 'seam',
    description: '自我进化智能体网格 (SEAM)',
    version: '1.0.0',

    // 2026.3.0+ 初始化方式
    async initialize(context?: any): Promise<void> {
      if (initialized) return;

      const config = loadConfig(context);
      // mesh 配置在创建后不能直接更新
      void config;

      if (config.autoStart) {
        await mesh.start();
      }

      initialized = true;
      console.log('[SEAM] Plugin initialized');
    },

    // 2026.2.26 可能使用的初始化方式
    async init(context?: any): Promise<void> {
      return this.initialize(context);
    },

    // 2026.2.26 可能使用的初始化方式（同步）
    setup(context?: any): void {
      const config = loadConfig(context);
      // mesh 配置在创建后不能直接更新
      void config;

      if (config.autoStart) {
        mesh.start().then(() => {
          initialized = true;
          console.log('[SEAM] Plugin initialized (via setup)');
        });
      }
    },

    // 销毁
    async destroy(): Promise<void> {
      if (initialized) {
        await mesh.stop();
        initialized = false;
        console.log('[SEAM] Plugin destroyed');
      }
    },

    // 2026.2.26 可能使用的销毁方式
    async stop(): Promise<void> {
      return this.destroy();
    },

    // 消息处理 - 2026.3.0+ 方式
    async onMessage(message: string, context?: any): Promise<string | null> {
      if (!initialized) {
        await this.initialize(context);
      }

      const lower = message.toLowerCase();

      // 帮助
      if (lower === 'help' || lower === '帮助') {
        return `🧬 SEAM (Self-Evolving Agent Mesh)

命令:
- 网格状态 / status - 查看网格状态
- 智能体列表 / agents - 列出智能体
- 进化计划 / plan - 查看进化计划
- 进化历史 / history - 查看进化历史`;
      }

      // 状态查询
      if (lower.includes('网格状态') || lower.includes('status')) {
        const status = mesh.getStatus();
        return `运行状态: ${status.isRunning ? '🟢' : '🔴'}
智能体数: ${status.agentCount}
队列长度: ${status.queueLength}
当前代: ${status.generation}`;
      }

      // 智能体列表
      if (lower.includes('智能体列表') || lower.includes('agents')) {
        const agents = mesh.getAgents();
        return agents.map(a =>
          `- ${a.id} (${a.type}): ${a.isBusy ? '🔴 忙碌' : '🟢 空闲'}, 适应度 ${(a.fitness * 100).toFixed(1)}%`
        ).join('\n');
      }

      return null;
    },

    // 2026.2.26 可能使用的消息处理方式
    async handleMessage(message: string): Promise<string | null> {
      return this.onMessage(message);
    },

    // 2026.2.26 可能使用的消息处理方式（同步）
    processMessage(message: string): string | null {
      // 同步处理，返回结果
      const lower = message.toLowerCase();
      if (lower.includes('网格状态')) {
        const status = mesh.getStatus();
        return `状态: ${status.isRunning ? '运行中' : '停止'}, ${status.agentCount} 个智能体`;
      }
      return null;
    },

    // 工具列表 - 2026.3.0+ 方式
    getTools() {
      return [
        {
          name: 'mesh_status',
          description: '查看智能体网格状态',
          handler: async () => mesh.getStatus(),
        },
        {
          name: 'mesh_agents',
          description: '列出所有智能体',
          handler: async () => ({ agents: mesh.getAgents() }),
        },
        {
          name: 'mesh_submit',
          description: '提交任务',
          parameters: {
            description: { type: 'string', required: true },
            complexity: { type: 'string', enum: ['simple', 'medium', 'complex'], default: 'medium' },
          },
          handler: async (params: any) => {
            const task = await mesh.submitTask(params.description, { complexity: params.complexity });
            return { taskId: task.id };
          },
        },
      ];
    },

    // 2026.2.26 可能使用的工具注册方式
    getCommands() {
      return this.getTools();
    },

    // 2026.2.26 可能使用的工具注册方式
    commands() {
      return this.getTools();
    },

    // 导出 mesh 实例供外部使用
    mesh,
  };

  return plugin;
}

// 创建插件实例
const plugin = createPlugin();

// 多种导出方式，兼容不同模块系统
export default plugin;
export { plugin, createPlugin };

// CommonJS 兼容
if (typeof module !== 'undefined' && module.exports) {
  module.exports = plugin;
  module.exports.default = plugin;
  module.exports.createPlugin = createPlugin;
}

// AMD 兼容
if (typeof define === 'function' && define.amd) {
  define('seam-plugin', [], function() {
    return plugin;
  });
}

// 全局变量（浏览器环境）
if (typeof window !== 'undefined') {
  (window as any).SeamPlugin = plugin;
}
