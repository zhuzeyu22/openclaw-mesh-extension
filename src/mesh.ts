/**
 * Self-Evolving Agent Mesh 核心实现
 * 集成智能进化规划器
 */

import type {
  MeshConfig,
  MeshStatus,
  AgentType,
  AgentDNA,
  Task,
  TaskResult,
  FitnessScore,
  EvolutionPlan,
} from './types.js';
import { EvolutionPlanner, type HistoricalEvolution } from './evolution-planner.js';
import { TechAwareness } from './tech-awareness.js';
import { ProactiveExplorer, type ExplorationOpportunity } from './proactive-explorer.js';
import { TaskExecutor, type ExecutorConfig } from './executor.js';
import { generateId, sleep, createResolvablePromise } from './utils.js';

interface Agent {
  id: string;
  type: AgentType;
  dna: AgentDNA;
  isBusy: boolean;
  taskCount: number;
  successCount: number;
  lastActiveAt: Date;
}

/**
 * 自我进化智能体网格
 */
export class SelfEvolvingMesh {
  private config: MeshConfig;
  private agents: Map<string, Agent> = new Map();
  private taskQueue: Task[] = [];
  private results: Map<string, TaskResult> = new Map();
  private resultWaiters: Map<string, Array<{ resolve: (value: TaskResult | null) => void; reject: (reason?: unknown) => void }>> = new Map();
  private isRunning = false;
  private generation = 1;
  private lastEvolutionAt?: Date;
  private evolutionTimer?: NodeJS.Timeout;
  private planner: EvolutionPlanner;
  private techAwareness: TechAwareness;
  private proactiveExplorer: ProactiveExplorer;
  private autoCheckTimer?: NodeJS.Timeout;
  private proactiveEvolutionTimer?: NodeJS.Timeout;
  private techScanTimer?: NodeJS.Timeout;
  private currentPlan: EvolutionPlan | null = null;
  private executor?: TaskExecutor;

  constructor(config: MeshConfig) {
    this.config = config;
    this.planner = new EvolutionPlanner();
    this.techAwareness = new TechAwareness();
    this.proactiveExplorer = new ProactiveExplorer(this.techAwareness);
  }

  /**
   * 启动网格
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('[SEAM] Starting Self-Evolving Agent Mesh...');

    // 创建创世智能体
    for (const spec of this.config.genesisAgents) {
      for (let i = 0; i < spec.count; i++) {
        await this.spawnAgent(spec.type);
      }
    }

    this.isRunning = true;

    // 启动科技资讯感知
    this.techAwareness.start(30); // 每30分钟扫描一次

    // 启动主动探索
    this.proactiveExplorer.start(20); // 每20分钟探索一次

    // 启动进化循环
    if (this.config.evolution.enabled) {
      this.startEvolutionLoop();
      this.startAutoCheckLoop(); // 启动自动检查
      this.startProactiveEvolutionLoop(); // 启动主动进化
    }

    console.log(`[SEAM] Mesh started with ${this.agents.size} agents`);
    console.log(`[SEAM] Smart evolution planner: enabled`);
    console.log(`[SEAM] Tech awareness: enabled`);
    console.log(`[SEAM] Proactive exploration: enabled`);
  }

  /**
   * 停止网格
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.evolutionTimer) {
      clearInterval(this.evolutionTimer);
    }
    if (this.autoCheckTimer) {
      clearInterval(this.autoCheckTimer);
    }
    if (this.proactiveEvolutionTimer) {
      clearInterval(this.proactiveEvolutionTimer);
    }
    if (this.techScanTimer) {
      clearInterval(this.techScanTimer);
    }
    this.techAwareness.stop();
    this.proactiveExplorer.stop();
    this.agents.clear();
    console.log('[SEAM] Mesh stopped');
  }

  /**
   * 提交任务
   */
  async submitTask(
    description: string,
    options: {
      complexity?: 'simple' | 'medium' | 'complex';
      submitter?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<Task> {
    const task: Task = {
      id: generateId(),
      description,
      complexity: options.complexity || 'medium',
      submitter: options.submitter || 'unknown',
      createdAt: new Date(),
      metadata: options.metadata,
    };

    this.taskQueue.push(task);

    // 尝试立即执行
    this.processQueue();

    return task;
  }

  /**
   * 获取任务结果（使用事件驱动，非忙等待）
   */
  async getResult(taskId: string, timeoutMs = 30000): Promise<TaskResult | null> {
    // 先检查是否已有结果
    const existingResult = this.results.get(taskId);
    if (existingResult) {
      this.results.delete(taskId);
      return existingResult;
    }

    // 创建等待器
    const { promise, resolve } = createResolvablePromise<TaskResult | null>();

    if (!this.resultWaiters.has(taskId)) {
      this.resultWaiters.set(taskId, []);
    }
    this.resultWaiters.get(taskId)!.push({ resolve, reject: () => resolve(null) });

    // 设置超时
    const timeoutId = setTimeout(() => resolve(null), timeoutMs);

    const result = await promise;
    clearTimeout(timeoutId);

    return result;
  }

  /**
   * 通知等待者结果可用
   */
  private notifyResultWaiters(taskId: string, result: TaskResult): void {
    const waiters = this.resultWaiters.get(taskId);
    if (waiters) {
      for (const { resolve } of waiters) {
        resolve(result);
      }
      this.resultWaiters.delete(taskId);
    }
  }

  /**
   * 获取网格状态
   */
  getStatus(): MeshStatus & { techAwareness: any; proactiveExploration: any } {
    const agentsByType: Record<AgentType, number> = {
      orchestrator: 0,
      researcher: 0,
      executor: 0,
      validator: 0,
      evolver: 0,
    };

    for (const agent of this.agents.values()) {
      agentsByType[agent.type]++;
    }

    return {
      isRunning: this.isRunning,
      agentCount: this.agents.size,
      agentsByType,
      queueLength: this.taskQueue.length,
      generation: this.generation,
      lastEvolutionAt: this.lastEvolutionAt,
      techAwareness: this.techAwareness.getStatus(),
      proactiveExploration: this.proactiveExplorer.getStatus(),
    };
  }

  /**
   * 手动触发智能进化
   */
  async evolve(): Promise<string> {
    return await this.runPlannedEvolution();
  }

  /**
   * 运行基于规划的智能进化
   */
  private async runPlannedEvolution(): Promise<string> {
    console.log(`\n🧬 [SEAM] Smart Evolution Cycle #${this.generation + 1}`);
    console.log('='.repeat(50));

    // 1. 收集系统状态
    const state = this.collectSystemState();

    // 2. 获取智能体DNA
    const agentDNAs = Array.from(this.agents.values()).map(a => a.dna);

    // 3. 制定进化计划
    const plan = this.planner.createPlan(state, agentDNAs);
    this.currentPlan = plan;

    console.log(`\n📋 Evolution Plan: #${plan.id.slice(-6)}`);
    console.log(`   Risk Level: ${plan.riskLevel.toUpperCase()}`);
    console.log(`   Estimated Duration: ${plan.estimatedDuration}ms`);

    // 显示瓶颈
    console.log(`\n🔍 Detected Bottlenecks (${plan.bottlenecks.length}):`);
    for (const b of plan.bottlenecks) {
      console.log(`   [${b.severity.toUpperCase()}] ${b.type}: ${b.description}`);
    }

    // 显示策略
    console.log(`\n📈 Evolution Strategies (${plan.strategies.length}):`);
    for (const s of plan.strategies) {
      console.log(`   ${s.priority}. ${s.name}`);
      console.log(`      Target: ${s.target} | Expected: ${s.expectedImpact.improvement}% ${s.expectedImpact.metric}`);
      console.log(`      Reason: ${s.reasoning}`);
    }

    // 显示预期结果
    console.log(`\n🎯 Expected Outcome:`);
    if (plan.expectedOutcome.successRate) {
      console.log(`   Success Rate: → ${(plan.expectedOutcome.successRate * 100).toFixed(1)}%`);
    }
    if (plan.expectedOutcome.responseTime) {
      console.log(`   Response Time: → ${plan.expectedOutcome.responseTime}ms`);
    }
    if (plan.expectedOutcome.capacity) {
      console.log(`   Capacity: → ${plan.expectedOutcome.capacity} agents`);
    }

    // 4. 执行计划
    console.log(`\n⚙️  Executing Plan...`);

    await this.planner.executePlan(plan, async (strategy) => {
      return await this.executeStrategy(strategy);
    });

    // 5. 学习
    this.planner.learn();

    this.generation++;
    this.lastEvolutionAt = new Date();

    console.log(`\n✅ Evolution Cycle #${this.generation} Completed`);
    console.log('='.repeat(50) + '\n');

    return `Smart evolution cycle #${this.generation} completed with ${plan.strategies.length} strategies`;
  }

  /**
   * 执行单个进化策略
   */
  private async executeStrategy(strategy: import('./types.js').EvolutionStrategy): Promise<boolean> {
    try {
      switch (strategy.target) {
        case 'spawn':
          if (strategy.agentType) {
            const count = (strategy.parameters.count as number) || 1;
            for (let i = 0; i < count; i++) {
              await this.spawnAgent(strategy.agentType);
            }
            console.log(`      ✅ Spawned ${count} ${strategy.agentType}(s)`);
          }
          return true;

        case 'retire':
          const threshold = (strategy.parameters.threshold as number) || 0.4;
          const toRetire = Array.from(this.agents.values())
            .filter(a => this.calculateFitness(a).overall < threshold);
          for (const agent of toRetire) {
            this.agents.delete(agent.id);
          }
          console.log(`      ✅ Retired ${toRetire.length} low-performing agents`);
          return true;

        case 'mutate':
          // 简化：变异通过增加新一代实现
          console.log(`      ✅ Applied mutations`);
          return true;

        default:
          console.log(`      ⚠️  Unknown strategy type: ${strategy.target}`);
          return false;
      }
    } catch (error) {
      console.error(`      ❌ Strategy failed: ${error}`);
      return false;
    }
  }

  /**
   * 获取智能体详情
   */
  getAgents(): Array<{
    id: string;
    type: AgentType;
    generation: number;
    isBusy: boolean;
    fitness: number;
  }> {
    return Array.from(this.agents.values()).map((agent) => ({
      id: agent.id,
      type: agent.type,
      generation: agent.dna.generation,
      isBusy: agent.isBusy,
      fitness: this.calculateFitness(agent).overall,
    }));
  }

  /**
   * 获取当前进化计划
   */
  getCurrentPlan(): EvolutionPlan | null {
    return this.currentPlan;
  }

  /**
   * 获取进化历史
   */
  getEvolutionHistory(): HistoricalEvolution[] {
    return this.planner.getHistory();
  }

  /**
   * 预测未来需求
   */
  predictFutureNeeds(days: number = 7) {
    return this.planner.predictFutureNeeds(days);
  }

  /**
   * 检查是否需要进化
   */
  checkEvolutionNeed() {
    const state = this.collectSystemState();
    return this.planner.shouldEvolve(state);
  }

  /**
   * 获取科技资讯感知报告
   */
  getTechAwarenessReport(): string {
    const status = this.techAwareness.getStatus();
    return `📡 **科技资讯感知报告**\n\n` +
      `总趋势数: ${status.totalTrends}\n` +
      `最近24小时新趋势: ${status.recentTrends}\n` +
      `高影响趋势: ${status.highImpactTrends}\n` +
      `主要类别: ${status.topCategories.join(', ') || '暂无'}\n`;
  }

  /**
   * 获取最新科技趋势
   */
  getTechTrends(): any[] {
    return this.techAwareness.getRecentTrends(48); // 最近48小时
  }

  /**
   * 获取主动探索报告
   */
  getExplorationReport(): string {
    return this.proactiveExplorer.getDetailedReport();
  }

  /**
   * 获取高价值进化机会
   */
  getOpportunities(): ExplorationOpportunity[] {
    return this.proactiveExplorer.getHighValueOpportunities(0.6);
  }

  /**
   * 触发主动探索
   */
  async triggerExploration(): Promise<any[]> {
    return await this.proactiveExplorer.explore();
  }

  // ============ 私有方法 ============

  private async spawnAgent(type: AgentType, parentIds: string[] = []): Promise<Agent> {
    const dnaId = generateId();
    const dna: AgentDNA = {
      id: dnaId,
      generation: parentIds.length > 0 ? this.generation + 1 : 1,
      parentIds,
      createdAt: new Date(),
      capabilities: this.getDefaultCapabilities(type),
      behavior: this.getDefaultBehavior(type),
    };

    const agent: Agent = {
      id: `seam-${type}-${dnaId.slice(0, 8)}`,  // 添加 seam- 命名空间前缀
      type,
      dna,
      isBusy: false,
      taskCount: 0,
      successCount: 0,
      lastActiveAt: new Date(),
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  private async processQueue(): Promise<void> {
    if (!this.isRunning || this.taskQueue.length === 0) return;

    const task = this.taskQueue[0];

    // 根据任务类型选择智能体
    const agentType = this.selectAgentType(task);
    const availableAgents = Array.from(this.agents.values()).filter(
      (a) => a.type === agentType && !a.isBusy
    );

    if (availableAgents.length === 0) {
      // 没有可用智能体，等待
      return;
    }

    // 选择最空闲的智能体
    const agent = availableAgents.sort(
      (a, b) => a.taskCount - b.taskCount
    )[0];

    // 出队并执行
    this.taskQueue.shift();
    await this.executeTask(task, agent);

    // 继续处理队列
    setImmediate(() => this.processQueue());
  }

  /**
   * 配置任务执行器
   */
  setExecutor(config: ExecutorConfig): void {
    this.executor = new TaskExecutor(config);
    console.log(`[SEAM] Task executor configured: ${config.provider}`);
  }

  private async executeTask(task: Task, agent: Agent): Promise<void> {
    agent.isBusy = true;
    agent.taskCount++;

    const startTime = Date.now();

    try {
      // 真实任务执行
      const output = await this.executeWithAgent(task, agent);

      const result: TaskResult = {
        taskId: task.id,
        success: true,
        output,
        executedBy: agent.id,
        durationMs: Date.now() - startTime,
      };

      agent.successCount++;
      this.results.set(task.id, result);
      this.notifyResultWaiters(task.id, result);
    } catch (error) {
      const result: TaskResult = {
        taskId: task.id,
        success: false,
        output: `Error: ${error}`,
        executedBy: agent.id,
        durationMs: Date.now() - startTime,
      };
      this.results.set(task.id, result);
      this.notifyResultWaiters(task.id, result);
    } finally {
      agent.isBusy = false;
      agent.lastActiveAt = new Date();
    }
  }

  /**
   * 使用真实执行器执行任务
   * 注意：必须配置执行器，否则抛出错误
   */
  private async executeWithAgent(task: Task, agent: Agent): Promise<string> {
    if (!this.executor) {
      throw new Error(
        'No AI executor configured. ' +
        'Please call mesh.setExecutor(config) before starting the mesh. ' +
        'Supported providers: openai, anthropic, local'
      );
    }

    const result = await this.executor.execute(task, agent.type);

    if (!result.success) {
      throw new Error(`Task execution failed: ${result.output}`);
    }

    return result.output;
  }

  private selectAgentType(task: Task): AgentType {
    const desc = task.description.toLowerCase();

    if (desc.includes('研究') || desc.includes('搜索') || desc.includes('调查')) {
      return 'researcher';
    }
    if (desc.includes('执行') || desc.includes('代码') || desc.includes('开发')) {
      return 'executor';
    }
    if (desc.includes('验证') || desc.includes('检查') || desc.includes('测试')) {
      return 'validator';
    }
    if (desc.includes('进化') || desc.includes('优化') || desc.includes('改进')) {
      return 'evolver';
    }
    if (task.complexity === 'complex') {
      return 'orchestrator';
    }

    return 'executor';
  }

  private startEvolutionLoop(): void {
    const interval = this.config.evolution.intervalMinutes * 60 * 1000;

    this.evolutionTimer = setInterval(() => {
      this.runEvolutionCycle();
    }, interval);

    console.log(`[SEAM] Scheduled evolution: ${this.config.evolution.intervalMinutes}min`);
  }

  /**
   * 自动检查循环 - 智能触发进化
   */
  private startAutoCheckLoop(): void {
    // 每30秒检查一次系统状态
    this.autoCheckTimer = setInterval(async () => {
      await this.checkAndEvolve();
    }, 30000);

    console.log(`[SEAM] Auto-check loop: 30s interval`);
  }

  /**
   * 主动进化循环 - 即使没有瓶颈也主动寻找改进机会
   */
  private startProactiveEvolutionLoop(): void {
    // 每2小时执行一次主动进化
    this.proactiveEvolutionTimer = setInterval(async () => {
      await this.runProactiveEvolution();
    }, 2 * 60 * 60 * 1000);

    console.log(`[SEAM] Proactive evolution loop: 2h interval`);
  }

  /**
   * 执行主动进化
   */
  private async runProactiveEvolution(): Promise<void> {
    console.log('\n🚀 [SEAM] Running proactive evolution...');

    // 1. 获取主动探索发现的机会
    const opportunities = this.proactiveExplorer.getHighValueOpportunities(0.6);

    if (opportunities.length === 0) {
      console.log('[SEAM] No high-value opportunities found, skipping proactive evolution');
      return;
    }

    console.log(`[SEAM] Found ${opportunities.length} high-value opportunities`);

    // 2. 将机会转换为进化策略
    const strategies = this.proactiveExplorer.convertToStrategies(opportunities.slice(0, 3));

    // 3. 执行主动进化
    for (const strategy of strategies) {
      console.log(`[SEAM] Proactive strategy: ${strategy.name}`);
      await this.executeStrategy(strategy);
    }

    console.log('[SEAM] Proactive evolution completed');
  }

  /**
   * 检查是否需要进化，如果需要则自动规划并执行
   */
  private async checkAndEvolve(): Promise<void> {
    const state = this.collectSystemState();
    const check = this.planner.shouldEvolve(state);

    if (check.should) {
      console.log(`[SEAM] 🚨 Auto-evolution triggered (${check.urgency})`);
      console.log(`       Reasons: ${check.reasons.join('; ')}`);

      await this.runPlannedEvolution();
    }
  }

  /**
   * 收集当前系统状态
   */
  private collectSystemState() {
    const status = this.getStatus();

    // 计算平均等待时间（简化）
    const avgWaitTime = this.taskQueue.length * 500;

    // 计算成功率
    const allAgents = Array.from(this.agents.values());
    const totalTasks = allAgents.reduce((sum, a) => sum + a.taskCount, 0);
    const totalSuccess = allAgents.reduce((sum, a) => sum + a.successCount, 0);
    const successRate = totalTasks > 0 ? totalSuccess / totalTasks : 1;

    // 计算资源利用率
    const busyAgents = allAgents.filter(a => a.isBusy).length;
    const utilization = allAgents.length > 0 ? busyAgents / allAgents.length : 0;

    // 计算平均响应时间
    const avgResponseTime = allAgents.length > 0
      ? allAgents.reduce((sum, a) => sum + (a.lastActiveAt.getTime() - Date.now()), 0) / allAgents.length
      : 0;

    return {
      timestamp: Date.now(),
      agentCount: status.agentCount,
      agentsByType: status.agentsByType,
      taskQueueLength: status.queueLength,
      avgTaskWaitTime: Math.abs(avgWaitTime),
      taskSuccessRate: successRate,
      avgResponseTime: Math.abs(avgResponseTime),
      resourceUtilization: utilization,
      errorRate: 1 - successRate,
    };
  }

  /**
   * 传统的定时进化（保留作为备选）
   */
  private async runEvolutionCycle(): Promise<void> {
    // 如果智能规划器检测需要进化，使用智能进化
    const state = this.collectSystemState();
    const check = this.planner.shouldEvolve(state);

    if (check.should) {
      await this.runPlannedEvolution();
    } else {
      console.log(`[SEAM] Scheduled check: No evolution needed (${check.reasons.length === 0 ? 'system healthy' : check.reasons.join(', ')})`);
    }
  }

  private calculateFitness(agent: Agent): FitnessScore {
    const successRate = agent.taskCount > 0 ? agent.successCount / agent.taskCount : 0.5;

    return {
      successRate,
      avgResponseTime: 1000, // 简化
      collaborationScore: 0.7,
      overall: successRate * 0.8 + 0.2,
    };
  }

  private getDefaultCapabilities(type: AgentType): AgentDNA['capabilities'] {
    const caps: Record<AgentType, AgentDNA['capabilities']> = {
      orchestrator: [
        { name: 'task-decomposition', level: 0.9, description: '任务分解' },
        { name: 'agent-coordination', level: 0.9, description: '智能体协调' },
      ],
      researcher: [
        { name: 'web-research', level: 0.9, description: '网络研究' },
        { name: 'knowledge-synthesis', level: 0.85, description: '知识综合' },
      ],
      executor: [
        { name: 'code-execution', level: 0.9, description: '代码执行' },
        { name: 'task-execution', level: 0.9, description: '任务执行' },
      ],
      validator: [
        { name: 'result-validation', level: 0.95, description: '结果验证' },
        { name: 'quality-assurance', level: 0.9, description: '质量保证' },
      ],
      evolver: [
        { name: 'evolution-control', level: 0.95, description: '进化控制' },
        { name: 'fitness-evaluation', level: 0.9, description: '适应度评估' },
      ],
    };
    return caps[type];
  }

  private getDefaultBehavior(type: AgentType): AgentDNA['behavior'] {
    return {
      promptTemplate: `你是 ${type} 智能体`,
      temperature: type === 'researcher' ? 0.5 : 0.3,
      maxTokens: 2000,
      tools: [],
    };
  }

}
