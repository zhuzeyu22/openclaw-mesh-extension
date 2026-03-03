/**
 * OpenClaw Plugin: Self-Evolving Agent Mesh
 *
 * 注册为 OpenClaw 的扩展，提供智能体网格能力
 */

import type { Skill, Context } from 'openclaw/plugin-sdk';
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
    intervalMinutes: 360, // 6小时
    selectionPressure: 0.3,
    mutationRate: 0.2,
  },
  autoStart: true,
  interceptMessages: false, // 默认不拦截消息，避免与其他 agent 冲突
};

/**
 * OpenClaw SEAM (Self-Evolving Agent Mesh) 插件
 *
 * 使用方式：
 * 1. 显式调用：@mesh 或 @seam + 命令
 *    例如：@mesh 网格状态
 *    例如：@seam 研究这个问题
 * 2. 工具调用：使用 /mesh_submit 等命令
 * 3. 自动拦截：设置 interceptMessages: true（可能与其他 agent 冲突）
 */
class MeshSkill implements Skill {
  name = 'seam';
  description = '自我进化智能体网格 (SEAM) - 使用 @mesh/@seam 调用，或使用 /mesh_* 命令';
  version = '1.0.0';

  private mesh: SelfEvolvingMesh | null = null;
  private config: MeshConfig = DEFAULT_CONFIG;

  async initialize(context: Context): Promise<void> {
    // 从配置中读取（支持 'seam' 或 'mesh' 配置键，优先使用 seam）
    const seamConfig = context.config.get('seam') as Partial<MeshConfig>;
    const meshConfig = context.config.get('mesh') as Partial<MeshConfig>;
    const userConfig = seamConfig || meshConfig || {};
    this.config = { ...DEFAULT_CONFIG, ...userConfig };

    // 创建网格
    this.mesh = new SelfEvolvingMesh(this.config);

    // 自动启动
    if (this.config.autoStart) {
      await this.mesh.start();
    }

    console.log('[SEAM Plugin] Initialized');
    console.log(`[SEAM Plugin] Message interception: ${this.config.interceptMessages ? 'enabled' : 'disabled (use @mesh/@seam to invoke)'}`);
  }

  async destroy(): Promise<void> {
    console.log('[SEAM Plugin] Shutting down...');
    if (this.mesh) {
      await this.mesh.stop();
    }
    console.log('[SEAM Plugin] Stopped');
  }

  /**
   * 获取可用的工具/命令
   */
  getTools() {
    return [
      {
        name: 'mesh_status',
        description: '查看智能体网格状态',
        handler: async () => {
          if (!this.mesh) return { error: 'Mesh not initialized' };
          return this.mesh.getStatus();
        },
      },
      {
        name: 'mesh_agents',
        description: '列出所有智能体',
        handler: async () => {
          if (!this.mesh) return { error: 'Mesh not initialized' };
          return { agents: this.mesh.getAgents() };
        },
      },
      {
        name: 'mesh_submit',
        description: '提交任务到网格',
        parameters: {
          description: {
            type: 'string',
            description: '任务描述',
            required: true,
          },
          complexity: {
            type: 'string',
            enum: ['simple', 'medium', 'complex'],
            description: '任务复杂度',
            default: 'medium',
          },
        },
        handler: async (params: { description: string; complexity?: 'simple' | 'medium' | 'complex' }) => {
          if (!this.mesh) return { error: 'Mesh not initialized' };

          const task = await this.mesh.submitTask(params.description, {
            complexity: params.complexity,
          });

          // 等待结果
          const result = await this.mesh.getResult(task.id, 60000);

          return {
            taskId: task.id,
            result: result || { status: 'pending', message: '任务正在处理中，稍后查询结果' },
          };
        },
      },
      {
        name: 'mesh_evolve',
        description: '手动触发进化周期',
        handler: async () => {
          if (!this.mesh) return { error: 'Mesh not initialized' };
          const message = await this.mesh.evolve();
          return { message };
        },
      },
      {
        name: 'mesh_plan',
        description: '查看当前进化计划',
        handler: async () => {
          if (!this.mesh) return { error: 'Mesh not initialized' };
          const plan = this.mesh.getCurrentPlan();
          const need = this.mesh.checkEvolutionNeed();
          return {
            currentPlan: plan,
            evolutionNeeded: need,
          };
        },
      },
      {
        name: 'mesh_history',
        description: '查看进化历史',
        handler: async () => {
          if (!this.mesh) return { error: 'Mesh not initialized' };
          const history = this.mesh.getEvolutionHistory();
          return {
            totalCycles: history.length,
            history: history.slice(-5).map(h => ({
              planId: h.plan.id,
              success: h.success,
              strategies: h.plan.strategies.length,
              timestamp: new Date(h.plan.createdAt).toISOString(),
            })),
          };
        },
      },
      {
        name: 'mesh_predict',
        description: '预测未来进化需求',
        handler: async () => {
          if (!this.mesh) return { error: 'Mesh not initialized' };
          const prediction = this.mesh.predictFutureNeeds(7);
          return prediction;
        },
      },
      {
        name: 'mesh_start',
        description: '启动网格',
        handler: async () => {
          if (!this.mesh) return { error: 'Mesh not initialized' };
          await this.mesh.start();
          return { message: 'Mesh started', status: this.mesh.getStatus() };
        },
      },
      {
        name: 'mesh_stop',
        description: '停止网格',
        handler: async () => {
          if (!this.mesh) return { error: 'Mesh not initialized' };
          await this.mesh.stop();
          return { message: 'Mesh stopped' };
        },
      },
    ];
  }

  /**
   * 处理自然语言消息
   * 支持显式调用前缀：@mesh、@seam、@网格
   * 或配置 interceptMessages: true 启用自动拦截
   */
  async onMessage(message: string, context: Context): Promise<string | null> {
    const lower = message.toLowerCase();

    // 检查是否是显式调用
    const isExplicitCall =
      lower.startsWith('@mesh') ||
      lower.startsWith('@seam') ||
      lower.startsWith('@网格') ||
      lower.startsWith('@进化') ||
      lower.includes('[use mesh]') ||
      lower.includes('[使用网格]');

    // 如果不是显式调用且未启用消息拦截，则让给其他 agent
    if (!isExplicitCall && !this.config.interceptMessages) {
      return null;
    }

    // 去除调用前缀，便于后续处理
    const cleanMessage = message
      .replace(/^@mesh\s*/i, '')
      .replace(/^@seam\s*/i, '')
      .replace(/^@网格\s*/i, '')
      .replace(/^@进化\s*/i, '')
      .replace(/\[use mesh\]/gi, '')
      .replace(/\[使用网格\]/g, '')
      .trim();

    const cleanLower = cleanMessage.toLowerCase();

    // 帮助信息
    if (cleanLower === 'help' || cleanLower === '帮助' || cleanLower === '?') {
      return `🧬 **SEAM (Self-Evolving Agent Mesh) 使用帮助**

**调用方式：**
- @mesh 命令  或  @seam 命令
- [use mesh] 命令  或  [使用网格] 命令

**可用命令：**
- **网格状态** - 查看网格运行状态
- **智能体列表** - 列出所有智能体
- **进化计划** - 查看当前进化计划
- **进化历史** - 查看进化历史
- **触发进化** / **强制进化** - 手动触发进化
- **预测** - 预测未来需求

**工具命令：**
- /mesh_status - 查看状态
- /mesh_agents - 列出智能体
- /mesh_submit - 提交任务
- /mesh_evolve - 触发进化

**提示：** 消息拦截已${this.config.interceptMessages ? '启用' : '禁用（推荐）'}。${!this.config.interceptMessages ? '使用 @mesh/@seam 前缀显式调用，避免与其他 agent 冲突。' : ''}`;
    }

    // 状态查询
    if (cleanLower.includes('网格状态') || cleanLower.includes('mesh status') || cleanLower === 'status') {
      const status = this.mesh?.getStatus();
      if (!status) return '网格尚未初始化';

      return `🧬 **智能体网格状态**

运行状态: ${status.isRunning ? '🟢 运行中' : '🔴 已停止'}
智能体总数: ${status.agentCount}
队列长度: ${status.queueLength}
当前代: ${status.generation}

**智能体分布:**
- 协调者: ${status.agentsByType.orchestrator}
- 研究者: ${status.agentsByType.researcher}
- 执行者: ${status.agentsByType.executor}
- 验证者: ${status.agentsByType.validator}
- 进化者: ${status.agentsByType.evolver}

${status.lastEvolutionAt ? `上次进化: ${status.lastEvolutionAt.toLocaleString()}` : ''}`;
    }

    // 智能体列表
    if (cleanLower.includes('智能体列表') || cleanLower.includes('agents')) {
      const agents = this.mesh?.getAgents();
      if (!agents || agents.length === 0) return '暂无智能体';

      return `🤖 **智能体列表** (${agents.length}个)

${agents.map(a => `- **${a.id}** (${a.type})
  - 代数: ${a.generation}
  - 状态: ${a.isBusy ? '🔴 忙碌' : '🟢 空闲'}
  - 适应度: ${(a.fitness * 100).toFixed(1)}%`).join('\n\n')}`;
    }

    // 进化计划
    if (cleanLower.includes('进化计划') || cleanLower.includes('evolution plan')) {
      if (!this.mesh) return '网格未初始化';

      const plan = this.mesh.getCurrentPlan();
      const need = this.mesh.checkEvolutionNeed();

      if (!need.should) {
        return `✅ **系统状态良好**\n\n当前不需要进化。\n监控指标一切正常。`;
      }

      if (!plan) {
        return `⏳ **正在规划进化...**\n\n触发原因: ${need.reasons.join('; ')}\n紧急程度: ${need.urgency}`;
      }

      return `📋 **进化计划** #${plan.id.slice(-6)}

**风险等级:** ${plan.riskLevel.toUpperCase()}
**预计时长:** ${plan.estimatedDuration}ms

**检测到的瓶颈:**
${plan.bottlenecks.map(b => `- [${b.severity.toUpperCase()}] ${b.type}: ${b.description}`).join('\n')}

**进化策略:**
${plan.strategies.map((s, i) => `${i + 1}. ${s.name}
   - 目标: ${s.target}
   - 预期改进: ${s.expectedImpact.improvement}% ${s.expectedImpact.metric}
   - 优先级: ${s.priority}`).join('\n\n')}

**预期结果:**
${plan.expectedOutcome.successRate ? `- 成功率: ${(plan.expectedOutcome.successRate * 100).toFixed(1)}%\n` : ''}${plan.expectedOutcome.responseTime ? `- 响应时间: ${plan.expectedOutcome.responseTime}ms\n` : ''}${plan.expectedOutcome.capacity ? `- 容量: ${plan.expectedOutcome.capacity} agents` : ''}`;
    }

    // 进化历史
    if (cleanLower.includes('进化历史') || cleanLower.includes('evolution history')) {
      if (!this.mesh) return '网格未初始化';

      const history = this.mesh.getEvolutionHistory();

      if (history.length === 0) {
        return '📚 **进化历史**\n\n暂无进化记录。';
      }

      const recentItems = history.slice(-5);
      let recentHistory = '';
      for (let i = 0; i < recentItems.length; i++) {
        const h = recentItems[i];
        const bottlenecks = h.plan.bottlenecks.map((b: {type: string}) => b.type).join(', ');
        recentHistory += `${i + 1}. 计划#${h.plan.id.slice(-6)} - ${h.success ? '✅ 成功' : '⚠️ 部分失败'}\n`;
        recentHistory += `   - 策略数: ${h.plan.strategies.length}\n`;
        recentHistory += `   - 瓶颈: ${bottlenecks}\n`;
        recentHistory += `   - 时间: ${new Date(h.plan.createdAt).toLocaleString()}\n`;
      }

      const allLessons = history.slice(-3).flatMap((h: {lessons: string[]}) => h.lessons);
      const recentLessons = allLessons.slice(-3);
      let lessons = '';
      for (const l of recentLessons) {
        lessons += `- ${l}\n`;
      }

      return `📚 **进化历史** (共${history.length}次)\n\n最近5次:\n${recentHistory}\n**经验总结:**\n${lessons || '- 暂无记录'}`;
    }

    // 预测需求
    if (cleanLower.includes('预测') || cleanLower.includes('forecast') || cleanLower.includes('predict')) {
      if (!this.mesh) return '网格未初始化';

      const prediction = this.mesh.predictFutureNeeds(7);

      const agentConfig = Object.entries(prediction.recommendedAgents)
        .map(([type, count]) => `- ${type}: ${count}个`).join('\n');

      const reasons = prediction.reasons.map((r: string) => `- ${r}`).join('\n') || '- 暂无特殊预测';

      return `🔮 **未来7天需求预测**\n\n**推荐智能体配置:**\n${agentConfig}\n\n**预测原因:**\n${reasons}`;
    }

    // 触发进化
    if ((cleanLower.includes('触发') || cleanLower.includes('开始')) && cleanLower.includes('进化')) {
      if (!this.mesh) return '网格未初始化';

      const need = this.mesh.checkEvolutionNeed();
      if (!need.should) {
        return `⚠️ **系统目前不需要进化**\n\n健康指标:\n${need.reasons.length === 0 ? '一切正常' : need.reasons.join('\n')}\n\n如仍想强制执行，请说"强制进化"。`;
      }

      const result = await this.mesh.evolve();
      return `🧬 **进化完成**\n\n${result}`;
    }

    // 强制进化
    if (cleanLower.includes('强制进化') || cleanLower === 'force evolve') {
      if (!this.mesh) return '网格未初始化';
      const result = await this.mesh.evolve();
      return `🧬 **强制进化完成**\n\n${result}`;
    }

    // 任务提交 - 仅在显式调用时处理复杂任务
    // 注意：如果启用 interceptMessages，以下关键词会触发任务提交
    if (
      isExplicitCall ||
      (this.config.interceptMessages &&
        (cleanLower.includes('研究') ||
          cleanLower.includes('分析') ||
          cleanLower.includes('开发') ||
          cleanLower.includes('复杂')))
    ) {
      if (!this.mesh) return null;

      const complexity =
        cleanLower.includes('复杂') || cleanLower.includes('开发') ? 'complex' : 'medium';

      const task = await this.mesh.submitTask(isExplicitCall ? cleanMessage : message, {
        complexity,
        submitter: 'openclaw-user',
      });

      // 等待结果
      const result = await this.mesh.getResult(task.id, 30000);

      if (result) {
        return `✅ **任务完成** (ID: ${task.id.slice(0, 8)})

执行者: ${result.executedBy}
耗时: ${result.durationMs}ms

**结果:**
${result.output}`;
      } else {
        return `⏳ **任务已提交** (ID: ${task.id.slice(0, 8)})

任务正在网格中处理，请稍后查询结果。
复杂度: ${complexity}`;
      }
    }

    return null; // 让 OpenClaw 处理其他消息
  }
}

/**
 * OpenClaw 插件入口
 */
export const meshPlugin = () => new MeshSkill();

export default meshPlugin;
