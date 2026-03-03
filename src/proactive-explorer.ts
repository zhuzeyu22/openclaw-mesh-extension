/**
 * 主动探索模块
 * 让系统能够主动寻找进化机会，而不只是被动响应瓶颈
 */

import type { AgentType, AgentDNA, EvolutionStrategy } from './types.js';
import type { TechAwareness, TechTrend } from './tech-awareness.js';
import { generateId, sleep, limitArraySize } from './utils.js';

interface ExplorationOpportunity {
  id: string;
  type: 'innovation' | 'optimization' | 'specialization' | 'collaboration';
  description: string;
  potential: number; // 0-1，潜在价值
  risk: number; // 0-1，风险程度
  requiredResources: number;
  expectedOutcome: {
    capabilityIncrease: number;
    efficiencyGain: number;
    newAbilities: string[];
  };
  trigger: 'tech-trend' | 'performance-gap' | 'user-demand' | 'curiosity';
}

interface Experiment {
  id: string;
  hypothesis: string;
  method: string;
  duration: number; // 毫秒
  metrics: string[];
  result?: {
    success: boolean;
    data: Record<string, number>;
    conclusion: string;
  };
}

/**
 * 主动探索器
 * 系统不再等待问题出现，而是主动寻找改进机会
 */
export class ProactiveExplorer {
  private techAwareness: TechAwareness;
  private opportunities: ExplorationOpportunity[] = [];
  private experiments: Experiment[] = [];
  private explorationInterval?: NodeJS.Timeout;
  private readonly explorationCooldown = 30 * 60 * 1000; // 30分钟冷却
  private lastExploration = 0;
  private readonly maxOpportunities = 50; // 最大机会数
  private readonly maxExperiments = 100; // 最大实验数

  constructor(techAwareness: TechAwareness) {
    this.techAwareness = techAwareness;
  }

  /**
   * 启动主动探索
   */
  start(intervalMinutes: number = 20): void {
    console.log(`[ProactiveExplorer] Started (interval: ${intervalMinutes}min)`);

    this.explorationInterval = setInterval(() => {
      this.explore();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * 停止探索
   */
  stop(): void {
    if (this.explorationInterval) {
      clearInterval(this.explorationInterval);
    }
  }

  /**
   * 执行探索周期
   */
  async explore(): Promise<ExplorationOpportunity[]> {
    // 冷却检查
    if (Date.now() - this.lastExploration < this.explorationCooldown) {
      return [];
    }

    console.log('\n🔬 [ProactiveExplorer] Starting exploration cycle...');
    this.lastExploration = Date.now();

    const newOpportunities: ExplorationOpportunity[] = [];

    // 1. 基于科技趋势探索
    const techOpportunities = await this.exploreTechTrends();
    newOpportunities.push(...techOpportunities);

    // 2. 基于能力缺口探索
    const gapOpportunities = await this.exploreCapabilityGaps();
    newOpportunities.push(...gapOpportunities);

    // 3. 基于好奇心探索（随机尝试新组合）
    const curiosityOpportunities = await this.exploreCuriosity();
    newOpportunities.push(...curiosityOpportunities);

    // 4. 评估并排序
    const evaluated = this.evaluateOpportunities(newOpportunities);

    // 5. 添加到机会池
    this.opportunities.push(...evaluated);

    // 6. 执行小实验验证最有潜力的机会
    await this.runValidationExperiments(evaluated.slice(0, 2));

    console.log(`[ProactiveExplorer] Found ${evaluated.length} opportunities`);

    // 清理旧数据，防止内存泄漏
    this.cleanupOldData();

    return evaluated;
  }

  /**
   * 清理旧数据，防止内存泄漏
   */
  private cleanupOldData(): void {
    this.opportunities = limitArraySize(this.opportunities, this.maxOpportunities);
    this.experiments = limitArraySize(this.experiments, this.maxExperiments);
  }

  /**
   * 基于科技趋势探索
   */
  private async exploreTechTrends(): Promise<ExplorationOpportunity[]> {
    const opportunities: ExplorationOpportunity[] = [];
    const trends = this.techAwareness.getHighImpactTrends();

    for (const trend of trends) {
      // 为高影响趋势创建专项进化机会
      if (trend.impact === 'critical') {
        opportunities.push({
          id: generateId('opp-tech'),
          type: 'innovation',
          description: `集成"${trend.title}"技术能力，提升系统竞争力`,
          potential: trend.relevance * 0.9,
          risk: 0.4,
          requiredResources: 3,
          expectedOutcome: {
            capabilityIncrease: 0.3,
            efficiencyGain: 0.2,
            newAbilities: [trend.category, 'trend-aware'],
          },
          trigger: 'tech-trend',
        });
      }

      // 为中等影响趋势创建优化机会
      if (trend.impact === 'high' && trend.category === 'ai') {
        opportunities.push({
          id: generateId('opp-ai'),
          type: 'optimization',
          description: `优化AI模型使用策略，应用${trend.title}最佳实践`,
          potential: trend.relevance * 0.7,
          risk: 0.2,
          requiredResources: 1,
          expectedOutcome: {
            capabilityIncrease: 0.1,
            efficiencyGain: 0.25,
            newAbilities: ['ai-optimized'],
          },
          trigger: 'tech-trend',
        });
      }
    }

    return opportunities;
  }

  /**
   * 基于能力缺口探索
   */
  private async exploreCapabilityGaps(): Promise<ExplorationOpportunity[]> {
    const opportunities: ExplorationOpportunity[] = [];

    // 模拟发现能力缺口
    const gaps = [
      {
        capability: '并行任务处理',
        current: 0.6,
        target: 0.9,
        impact: 'high',
      },
      {
        capability: '跨智能体记忆共享',
        current: 0.3,
        target: 0.8,
        impact: 'medium',
      },
      {
        capability: '自适应负载均衡',
        current: 0.7,
        target: 0.95,
        impact: 'high',
      },
    ];

    for (const gap of gaps) {
      if (gap.target - gap.current > 0.2) {
        opportunities.push({
          id: generateId('opp-gap'),
          type: 'specialization',
          description: `专项提升"${gap.capability}"能力，从${(gap.current * 100).toFixed(0)}%提升到${(gap.target * 100).toFixed(0)}%`,
          potential: (gap.target - gap.current) * 0.8,
          risk: 0.3,
          requiredResources: 2,
          expectedOutcome: {
            capabilityIncrease: gap.target - gap.current,
            efficiencyGain: (gap.target - gap.current) * 0.5,
            newAbilities: [gap.capability.toLowerCase().replace(/\s/g, '-')],
          },
          trigger: 'performance-gap',
        });
      }
    }

    return opportunities;
  }

  /**
   * 基于好奇心探索（随机创新）
   */
  private async exploreCuriosity(): Promise<ExplorationOpportunity[]> {
    const opportunities: ExplorationOpportunity[] = [];

    // 随机生成一些"好奇"的尝试
    const curiousIdeas = [
      {
        type: 'collaboration' as const,
        desc: '尝试让多个Executor并行处理同一任务的不同部分，然后合并结果',
        potential: 0.6,
      },
      {
        type: 'innovation' as const,
        desc: '探索动态Agent类型转换：根据任务需求临时改变Agent specialization',
        potential: 0.7,
      },
      {
        type: 'optimization' as const,
        desc: '实验不同的任务队列排序算法（不仅仅是优先级）',
        potential: 0.5,
      },
    ];

    // 随机选择1-2个想法
    const selected = curiousIdeas.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 2) + 1);

    for (const idea of selected) {
      opportunities.push({
        id: generateId('opp-curious'),
        type: idea.type,
        description: idea.desc,
        potential: idea.potential,
        risk: 0.5, // 好奇探索风险较高
        requiredResources: 1,
        expectedOutcome: {
          capabilityIncrease: 0.1,
          efficiencyGain: 0.1,
          newAbilities: ['experimental'],
        },
        trigger: 'curiosity',
      });
    }

    return opportunities;
  }

  /**
   * 评估机会价值
   */
  private evaluateOpportunities(opportunities: ExplorationOpportunity[]): ExplorationOpportunity[] {
    return opportunities
      .map(opp => ({
        ...opp,
        // 计算综合评分
        score: opp.potential * (1 - opp.risk) / opp.requiredResources,
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5); // 只保留前5个
  }

  /**
   * 运行验证实验
   */
  private async runValidationExperiments(opportunities: ExplorationOpportunity[]): Promise<void> {
    for (const opp of opportunities) {
      const experiment: Experiment = {
        id: generateId('exp'),
        hypothesis: opp.description,
        method: `小规模试运行${opp.type}策略`,
        duration: 5 * 60 * 1000, // 5分钟
        metrics: ['success-rate', 'response-time', 'resource-usage'],
      };

      console.log(`[ProactiveExplorer] Starting experiment: ${experiment.id}`);

      // 模拟实验
      await this.simulateExperiment(experiment, opp);

      this.experiments.push(experiment);

      console.log(`[ProactiveExplorer] Experiment ${experiment.id}: ${experiment.result?.success ? '✅ Success' : '❌ Failed'}`);
    }
  }

  /**
   * 模拟实验
   */
  private async simulateExperiment(experiment: Experiment, opportunity: ExplorationOpportunity): Promise<void> {
    // 模拟实验延迟
    await sleep(100);

    // 根据机会潜力决定成功率
    const successChance = opportunity.potential * 0.7 + 0.2;
    const success = Math.random() < successChance;

    experiment.result = {
      success,
      data: {
        'success-rate': success ? 0.85 : 0.45,
        'response-time': success ? 800 : 2000,
        'resource-usage': opportunity.requiredResources * 20,
      },
      conclusion: success
        ? `验证通过：${opportunity.description}确实能提升系统能力`
        : `验证失败：${opportunity.description}在当前条件下不可行`,
    };
  }

  /**
   * 获取高价值机会
   */
  getHighValueOpportunities(minPotential: number = 0.6): ExplorationOpportunity[] {
    return this.opportunities
      .filter(opp => opp.potential >= minPotential)
      .sort((a, b) => b.potential - a.potential);
  }

  /**
   * 将机会转换为进化策略
   */
  convertToStrategies(opportunities: ExplorationOpportunity[]): EvolutionStrategy[] {
    return opportunities.map(opp => ({
      name: opp.description.slice(0, 50),
      target: this.mapTypeToTarget(opp.type),
      priority: Math.floor(opp.potential * 10),
      expectedImpact: {
        metric: opp.type === 'innovation' ? 'capability' : 'efficiency',
        improvement: Math.floor(opp.expectedOutcome.capabilityIncrease * 100),
      },
      reasoning: `${opp.trigger === 'tech-trend' ? '基于技术趋势' : opp.trigger === 'curiosity' ? '基于创新探索' : '基于能力缺口'}：${opp.description}`,
      parameters: {
        type: opp.type,
        risk: opp.risk,
        resources: opp.requiredResources,
        newAbilities: opp.expectedOutcome.newAbilities,
      },
    }));
  }

  /**
   * 类型映射
   */
  private mapTypeToTarget(type: ExplorationOpportunity['type']): 'spawn' | 'mutate' | 'merge' | 'rebalance' | 'retire' {
    const mapping: Record<string, 'spawn' | 'mutate' | 'merge' | 'rebalance' | 'retire'> = {
      innovation: 'spawn',
      optimization: 'mutate',
      specialization: 'mutate',
      collaboration: 'rebalance',
    };
    return mapping[type] || 'mutate';
  }

  /**
   * 获取探索状态
   */
  getStatus(): {
    totalOpportunities: number;
    pendingExperiments: number;
    completedExperiments: number;
    successRate: number;
  } {
    const completed = this.experiments.filter(e => e.result);
    const successful = completed.filter(e => e.result?.success);

    return {
      totalOpportunities: this.opportunities.length,
      pendingExperiments: this.experiments.filter(e => !e.result).length,
      completedExperiments: completed.length,
      successRate: completed.length > 0 ? successful.length / completed.length : 0,
    };
  }

  /**
   * 获取详细报告
   */
  getDetailedReport(): string {
    const status = this.getStatus();
    const topOpportunities = this.getHighValueOpportunities(0.7);

    let report = `🔬 **主动探索报告**\n\n`;
    report += `累计发现机会: ${status.totalOpportunities}\n`;
    report += `完成实验: ${status.completedExperiments} (成功率: ${(status.successRate * 100).toFixed(1)}%)\n\n`;

    if (topOpportunities.length > 0) {
      report += `**高价值机会 (${topOpportunities.length}):**\n`;
      for (let i = 0; i < Math.min(topOpportunities.length, 3); i++) {
        const opp = topOpportunities[i];
        report += `${i + 1}. [${opp.type}] ${opp.description.slice(0, 40)}... (潜力: ${(opp.potential * 100).toFixed(0)}%)\n`;
      }
    }

    return report;
  }
}

export type { ExplorationOpportunity, Experiment };
