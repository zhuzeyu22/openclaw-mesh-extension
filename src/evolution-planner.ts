/**
 * 进化规划器 - 智能分析和规划进化策略
 *
 * 不再被动等待定时触发，而是主动分析系统状态，
 * 识别瓶颈，制定针对性的进化计划。
 */

import type { MeshConfig, AgentDNA, AgentType, FitnessScore, EvolutionStrategy, EvolutionPlan } from './types.js';

interface SystemState {
  timestamp: number;
  agentCount: number;
  agentsByType: Record<AgentType, number>;
  taskQueueLength: number;
  avgTaskWaitTime: number;
  taskSuccessRate: number;
  avgResponseTime: number;
  resourceUtilization: number;
  errorRate: number;
}

interface Bottleneck {
  type: 'capacity' | 'capability' | 'efficiency' | 'balance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedAgents: AgentType[];
  metrics: Record<string, number>;
}

export interface HistoricalEvolution {
  plan: EvolutionPlan;
  actualOutcome: Record<string, number>;
  success: boolean;
  lessons: string[];
}

/**
 * 进化规划器 - 系统的"大脑"，负责制定进化策略
 */
export class EvolutionPlanner {
  private history: HistoricalEvolution[] = [];
  private currentPlan: EvolutionPlan | null = null;
  private lastState: SystemState | null = null;
  private stateHistory: SystemState[] = [];
  private readonly maxHistoryLength = 100;

  // 自适应阈值（会根据历史数据调整）
  private thresholds = {
    queueLength: 5,
    waitTime: 3000,      // 3秒
    errorRate: 0.05,     // 5%
    utilization: 0.8,    // 80%
    responseTime: 2000,  // 2秒
  };

  /**
   * 分析系统状态，决定是否需要进化
   */
  shouldEvolve(currentState: SystemState): {
    should: boolean;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
  } {
    const reasons: string[] = [];
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // 检查队列积压
    if (currentState.taskQueueLength > this.thresholds.queueLength) {
      reasons.push(`任务队列积压: ${currentState.taskQueueLength} 个任务等待`);
      urgency = this.escalate(urgency);
    }

    // 检查等待时间
    if (currentState.avgTaskWaitTime > this.thresholds.waitTime) {
      reasons.push(`平均等待时间过长: ${currentState.avgTaskWaitTime.toFixed(0)}ms`);
      urgency = this.escalate(urgency);
    }

    // 检查错误率
    if (currentState.errorRate > this.thresholds.errorRate) {
      reasons.push(`错误率过高: ${(currentState.errorRate * 100).toFixed(1)}%`);
      urgency = this.escalate(urgency, 2); // 错误率直接升两级
    }

    // 检查资源利用率
    if (currentState.resourceUtilization > this.thresholds.utilization) {
      reasons.push(`资源利用率饱和: ${(currentState.resourceUtilization * 100).toFixed(1)}%`);
      urgency = this.escalate(urgency);
    }

    // 检查响应时间
    if (currentState.avgResponseTime > this.thresholds.responseTime) {
      reasons.push(`响应时间过慢: ${currentState.avgResponseTime.toFixed(0)}ms`);
      urgency = this.escalate(urgency);
    }

    // 检查能力缺口（与上一次状态比较）
    if (this.lastState) {
      const bottleneck = this.detectBottleneck(currentState, this.lastState);
      if (bottleneck) {
        reasons.push(`检测到瓶颈: ${bottleneck.description}`);
        urgency = this.escalate(urgency, bottleneck.severity === 'critical' ? 2 : 1);
      }
    }

    // 检查历史模式 - 如果连续性能下降，触发进化
    if (this.stateHistory.length >= 3) {
      const trend = this.analyzeTrend();
      if (trend.direction === 'degrading' && trend.confidence > 0.7) {
        reasons.push(`性能持续下降趋势 (置信度: ${(trend.confidence * 100).toFixed(0)}%)`);
        urgency = this.escalate(urgency);
      }
    }

    this.lastState = currentState;
    this.stateHistory.push(currentState);
    if (this.stateHistory.length > this.maxHistoryLength) {
      this.stateHistory.shift();
    }

    return {
      should: reasons.length > 0,
      urgency,
      reasons,
    };
  }

  /**
   * 制定进化计划
   */
  createPlan(currentState: SystemState, agentDNAs: AgentDNA[]): EvolutionPlan {
    const bottlenecks = this.identifyAllBottlenecks(currentState, agentDNAs);
    const strategies = this.generateStrategies(bottlenecks, currentState, agentDNAs);

    // 按优先级排序
    strategies.sort((a, b) => b.priority - a.priority);

    const plan: EvolutionPlan = {
      id: this.generateId(),
      createdAt: Date.now(),
      triggers: bottlenecks.map(b => b.type),
      bottlenecks,
      strategies: strategies.slice(0, 5), // 最多5个策略
      expectedOutcome: this.predictOutcome(strategies, currentState),
      estimatedDuration: this.estimateDuration(strategies),
      riskLevel: this.assessRisk(strategies),
    };

    this.currentPlan = plan;
    return plan;
  }

  /**
   * 执行计划并学习
   */
  async executePlan(
    plan: EvolutionPlan,
    execute: (strategy: EvolutionStrategy) => Promise<boolean>
  ): Promise<void> {
    console.log(`[EvolutionPlanner] Executing plan #${plan.id}`);
    console.log(`  Strategies: ${plan.strategies.length}`);
    console.log(`  Risk Level: ${plan.riskLevel}`);

    const results: boolean[] = [];

    for (const strategy of plan.strategies) {
      console.log(`  → Executing: ${strategy.name}`);
      try {
        const success = await execute(strategy);
        results.push(success);
        console.log(`    Result: ${success ? '✅ Success' : '❌ Failed'}`);
      } catch (error) {
        console.error(`    Error: ${error}`);
        results.push(false);
      }
    }

    // 记录历史，用于未来学习
    this.recordHistory(plan, results);
  }

  /**
   * 自适应学习 - 根据历史调整策略
   */
  learn(): void {
    if (this.history.length < 3) return;

    console.log('[EvolutionPlanner] Learning from history...');

    // 分析哪些策略有效
    const strategyEffectiveness = new Map<string, { attempts: number; successes: number }>();

    for (const record of this.history) {
      for (let i = 0; i < record.plan.strategies.length; i++) {
        const strategy = record.plan.strategies[i];
        const success = record.success;

        const current = strategyEffectiveness.get(strategy.name) || { attempts: 0, successes: 0 };
        current.attempts++;
        if (success) current.successes++;
        strategyEffectiveness.set(strategy.name, current);
      }
    }

    // 调整阈值
    const recentRecords = this.history.slice(-10);
    const avgQueueLength = recentRecords.reduce((sum, r) => {
      const bottleneck = r.plan.bottlenecks.find((b: {type: string}) => b.type === 'capacity');
      return sum + (bottleneck ? bottleneck.metrics.queueLength || 0 : 0);
    }, 0) / recentRecords.length;

    // 如果频繁出现容量瓶颈，降低触发阈值
    if (avgQueueLength > 3) {
      this.thresholds.queueLength = Math.max(3, this.thresholds.queueLength - 1);
      console.log(`  Adjusted queue threshold to ${this.thresholds.queueLength}`);
    }

    // 输出学习总结
    console.log('  Strategy effectiveness:');
    for (const [name, stats] of strategyEffectiveness) {
      const rate = (stats.successes / stats.attempts * 100).toFixed(1);
      console.log(`    ${name}: ${rate}% (${stats.successes}/${stats.attempts})`);
    }
  }

  /**
   * 预测长期进化需求
   */
  predictFutureNeeds(daysAhead: number = 7): {
    recommendedAgents: Record<AgentType, number>;
    reasons: string[];
  } {
    const trend = this.analyzeTrend();
    const currentDistribution = this.getLastDistribution();

    const recommendations: Record<AgentType, number> = {
      orchestrator: currentDistribution.orchestrator || 1,
      researcher: currentDistribution.researcher || 0,
      executor: currentDistribution.executor || 0,
      validator: currentDistribution.validator || 0,
      evolver: 1, // 始终保持1个进化者
    };

    const reasons: string[] = [];

    // 基于趋势预测
    if (trend.direction === 'degrading') {
      // 性能下降，增加执行者以应对负载
      const additionalExecutors = Math.ceil(recommendations.executor * 0.3);
      recommendations.executor += additionalExecutors;
      reasons.push(`性能下降趋势，增加 ${additionalExecutors} 个执行者应对负载`);
    }

    // 基于历史瓶颈类型
    const bottleneckTypes = this.history.flatMap(h => h.plan.bottlenecks.map((b: {type: string}) => b.type));
    const typeCounts = this.countOccurrences(bottleneckTypes);

    if (typeCounts['capability'] > typeCounts['capacity']) {
      // 能力瓶颈多于容量瓶颈，增加研究者
      recommendations.researcher += 1;
      reasons.push('历史数据显示频繁出现能力瓶颈，增加研究者');
    }

    if (typeCounts['efficiency'] > 3) {
      // 效率问题多，增加验证者
      recommendations.validator = (recommendations.validator || 0) + 1;
      reasons.push('历史数据显示效率问题频发，增加验证者');
    }

    return { recommendedAgents: recommendations, reasons };
  }

  // ============ 私有方法 ============

  private escalate(
    current: 'low' | 'medium' | 'high' | 'critical',
    levels: number = 1
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels_array = ['low', 'medium', 'high', 'critical'] as const;
    const currentIndex = levels_array.indexOf(current);
    const newIndex = Math.min(currentIndex + levels, 3);
    return levels_array[newIndex];
  }

  private detectBottleneck(current: SystemState, previous: SystemState): Bottleneck | null {
    // 检测变化趋势
    const waitTimeIncrease = current.avgTaskWaitTime - previous.avgTaskWaitTime;
    const successRateDrop = previous.taskSuccessRate - current.taskSuccessRate;

    if (waitTimeIncrease > 1000 && current.taskQueueLength > 3) {
      return {
        type: 'capacity',
        severity: waitTimeIncrease > 3000 ? 'critical' : 'high',
        description: '处理能力不足，任务等待时间激增',
        affectedAgents: ['executor'],
        metrics: {
          waitTimeIncrease,
          queueLength: current.taskQueueLength,
        },
      };
    }

    if (successRateDrop > 0.1) {
      return {
        type: 'capability',
        severity: successRateDrop > 0.3 ? 'critical' : 'high',
        description: '任务成功率显著下降',
        affectedAgents: ['researcher', 'validator'],
        metrics: {
          successRateDrop: successRateDrop * 100,
          currentRate: current.taskSuccessRate * 100,
        },
      };
    }

    return null;
  }

  private identifyAllBottlenecks(
    state: SystemState,
    agentDNAs: AgentDNA[]
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // 容量瓶颈
    if (state.taskQueueLength > this.thresholds.queueLength) {
      bottlenecks.push({
        type: 'capacity',
        severity: state.taskQueueLength > 10 ? 'critical' : 'high',
        description: `任务队列积压 ${state.taskQueueLength} 个`,
        affectedAgents: ['executor'],
        metrics: { queueLength: state.taskQueueLength },
      });
    }

    // 能力瓶颈 - 通过成功率判断
    if (state.taskSuccessRate < 0.8) {
      bottlenecks.push({
        type: 'capability',
        severity: state.taskSuccessRate < 0.5 ? 'critical' : 'medium',
        description: `任务成功率仅 ${(state.taskSuccessRate * 100).toFixed(1)}%`,
        affectedAgents: ['researcher', 'executor'],
        metrics: { successRate: state.taskSuccessRate },
      });
    }

    // 效率瓶颈
    if (state.avgResponseTime > this.thresholds.responseTime) {
      bottlenecks.push({
        type: 'efficiency',
        severity: state.avgResponseTime > 5000 ? 'high' : 'medium',
        description: `平均响应时间 ${state.avgResponseTime.toFixed(0)}ms`,
        affectedAgents: ['executor', 'validator'],
        metrics: { responseTime: state.avgResponseTime },
      });
    }

    // 平衡瓶颈 - 检查智能体分布
    const distribution = this.analyzeDistribution(agentDNAs);
    if (distribution.imbalance > 0.5) {
      bottlenecks.push({
        type: 'balance',
        severity: 'low',
        description: `智能体类型分布不均衡: ${distribution.details}`,
        affectedAgents: distribution.underrepresented,
        metrics: { imbalance: distribution.imbalance },
      });
    }

    return bottlenecks;
  }

  private generateStrategies(
    bottlenecks: Bottleneck[],
    state: SystemState,
    agentDNAs: AgentDNA[]
  ): EvolutionStrategy[] {
    const strategies: EvolutionStrategy[] = [];

    for (const bottleneck of bottlenecks) {
      switch (bottleneck.type) {
        case 'capacity':
          strategies.push({
            name: '扩容执行者',
            target: 'spawn',
            agentType: 'executor',
            priority: bottleneck.severity === 'critical' ? 10 : 7,
            expectedImpact: {
              metric: 'queueLength',
              improvement: -40, // 预计减少40%队列长度
            },
            reasoning: `队列积压 ${bottleneck.metrics.queueLength}，需要更多执行者`,
            parameters: { count: bottleneck.severity === 'critical' ? 3 : 1 },
          });
          break;

        case 'capability':
          strategies.push({
            name: '增强研究能力',
            target: 'spawn',
            agentType: 'researcher',
            priority: 8,
            expectedImpact: {
              metric: 'successRate',
              improvement: 15,
            },
            reasoning: `成功率低，需要更强的研究分析能力`,
            parameters: { count: 1, specialize: 'deep-research' },
          });

          // 同时考虑变异现有智能体
          const lowPerformers = agentDNAs.filter(dna => {
            const fitness = (dna as any).fitness as FitnessScore | undefined;
            return fitness && fitness.overall < 0.6;
          });

          if (lowPerformers.length > 0) {
            strategies.push({
              name: '变异低表现者',
              target: 'mutate',
              priority: 6,
              expectedImpact: {
                metric: 'successRate',
                improvement: 10,
              },
              reasoning: `${lowPerformers.length} 个智能体表现不佳，尝试基因变异`,
              parameters: { targets: lowPerformers.map(d => d.id) },
            });
          }
          break;

        case 'efficiency':
          strategies.push({
            name: '优化执行流程',
            target: 'mutate',
            agentType: 'executor',
            priority: 7,
            expectedImpact: {
              metric: 'responseTime',
              improvement: -25,
            },
            reasoning: `响应时间过慢，优化执行者参数`,
            parameters: {
              optimizeFor: 'speed',
              temperature: 0.2,
            },
          });

          strategies.push({
            name: '增加验证并行度',
            target: 'spawn',
            agentType: 'validator',
            priority: 5,
            expectedImpact: {
              metric: 'responseTime',
              improvement: -15,
            },
            reasoning: '验证可能成为瓶颈，增加并行验证能力',
            parameters: { count: 1 },
          });
          break;

        case 'balance':
          for (const agentType of bottleneck.affectedAgents) {
            strategies.push({
              name: `补充${agentType}`,
              target: 'spawn',
              agentType,
              priority: 4,
              expectedImpact: {
                metric: 'balance',
                improvement: 20,
              },
              reasoning: `${agentType} 数量不足，影响系统平衡`,
              parameters: { count: 1 },
            });
          }
          break;
      }
    }

    // 添加长期的优化策略
    if (state.agentCount > 10) {
      strategies.push({
        name: '淘汰低效者',
        target: 'retire',
        priority: 3,
        expectedImpact: {
          metric: 'resourceUtilization',
          improvement: -20,
        },
        reasoning: `智能体数量(${state.agentCount})较多，淘汰低效者优化资源`,
        parameters: { threshold: 0.4 }, // 淘汰适应度<0.4的
      });
    }

    return strategies;
  }

  private predictOutcome(strategies: EvolutionStrategy[], currentState: SystemState) {
    let successRate = currentState.taskSuccessRate;
    let responseTime = currentState.avgResponseTime;
    let capacity = currentState.agentCount;

    for (const strategy of strategies) {
      const impact = strategy.expectedImpact;

      if (impact.metric === 'successRate') {
        successRate = Math.min(0.99, successRate * (1 + impact.improvement / 100));
      } else if (impact.metric === 'responseTime') {
        responseTime = Math.max(100, responseTime * (1 + impact.improvement / 100));
      } else if (impact.metric === 'queueLength' && strategy.target === 'spawn') {
        capacity += (strategy.parameters.count as number) || 1;
      }
    }

    return {
      successRate: Math.round(successRate * 100) / 100,
      responseTime: Math.round(responseTime),
      capacity,
    };
  }

  private estimateDuration(strategies: EvolutionStrategy[]): number {
    // 估算执行时间（毫秒）
    let duration = 0;

    for (const strategy of strategies) {
      switch (strategy.target) {
        case 'spawn':
          duration += 2000 * ((strategy.parameters.count as number) || 1);
          break;
        case 'mutate':
          duration += 1000 * ((strategy.parameters.targets as string[])?.length || 1);
          break;
        case 'retire':
          duration += 500;
          break;
        default:
          duration += 1000;
      }
    }

    return duration;
  }

  private assessRisk(strategies: EvolutionStrategy[]): 'low' | 'medium' | 'high' {
    const spawnCount = strategies.filter(s => s.target === 'spawn').length;
    const retireCount = strategies.filter(s => s.target === 'retire').length;
    const mutateCount = strategies.filter(s => s.target === 'mutate').length;

    if (spawnCount > 3 || retireCount > 2) {
      return 'high';
    }
    if (spawnCount > 1 || mutateCount > 2) {
      return 'medium';
    }
    return 'low';
  }

  private analyzeTrend(): {
    direction: 'improving' | 'stable' | 'degrading';
    confidence: number;
  } {
    if (this.stateHistory.length < 3) {
      return { direction: 'stable', confidence: 0 };
    }

    const recent = this.stateHistory.slice(-5);
    const successRates = recent.map(s => s.taskSuccessRate);

    // 简单线性回归
    let improving = 0;
    let degrading = 0;

    for (let i = 1; i < successRates.length; i++) {
      if (successRates[i] > successRates[i - 1]) improving++;
      else if (successRates[i] < successRates[i - 1]) degrading++;
    }

    const total = successRates.length - 1;
    const confidence = Math.max(improving, degrading) / total;

    if (improving > degrading) {
      return { direction: 'improving', confidence };
    } else if (degrading > improving) {
      return { direction: 'degrading', confidence };
    } else {
      return { direction: 'stable', confidence: 1 - confidence };
    }
  }

  private analyzeDistribution(agentDNAs: AgentDNA[]): {
    imbalance: number;
    details: string;
    underrepresented: AgentType[];
  } {
    const counts: Record<string, number> = {};
    for (const dna of agentDNAs) {
      // 从ID推断类型（简化）
      const type = dna.id.split('-')[0] as AgentType;
      counts[type] = (counts[type] || 0) + 1;
    }

    const values = Object.values(counts);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    const imbalance = (max - min) / avg;

    const underrepresented: AgentType[] = [];
    for (const [type, count] of Object.entries(counts)) {
      if (count < avg * 0.5) {
        underrepresented.push(type as AgentType);
      }
    }

    return {
      imbalance,
      details: Object.entries(counts).map(([t, c]) => `${t}:${c}`).join(', '),
      underrepresented,
    };
  }

  private recordHistory(plan: EvolutionPlan, results: boolean[]): void {
    const actualOutcome: Record<string, number> = {};

    // 简化：假设计划中的策略被执行了
    for (let i = 0; i < plan.strategies.length; i++) {
      const strategy = plan.strategies[i];
      const success = results[i];

      if (success) {
        actualOutcome[strategy.name] = strategy.expectedImpact.improvement;
      } else {
        actualOutcome[strategy.name] = 0;
      }
    }

    const lessons: string[] = [];

    // 总结教训
    if (results.every(r => r)) {
      lessons.push('所有策略执行成功');
    } else if (results.every(r => !r)) {
      lessons.push('所有策略执行失败，需要重新评估');
    } else {
      lessons.push('部分策略成功，识别有效策略');
    }

    this.history.push({
      plan,
      actualOutcome,
      success: results.filter(r => r).length / results.length > 0.5,
      lessons,
    });

    // 限制历史长度
    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  private getLastDistribution(): Partial<Record<AgentType, number>> {
    if (this.stateHistory.length === 0) return {};
    const last = this.stateHistory[this.stateHistory.length - 1];
    return last.agentsByType;
  }

  private countOccurrences<T>(arr: T[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of arr) {
      const key = String(item);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  private generateId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // 公开方法供外部使用
  getCurrentPlan(): EvolutionPlan | null {
    return this.currentPlan;
  }

  getHistory(): HistoricalEvolution[] {
    return [...this.history];
  }

  getStateHistory(): SystemState[] {
    return [...this.stateHistory];
  }
}
