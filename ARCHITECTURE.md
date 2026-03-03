# SEAM 架构与运行原理

**SEAM (Self-Evolving Agent Mesh)** - 自我进化智能体网格

---

## 目录

1. [架构概览](#架构概览)
2. [核心概念](#核心概念)
3. [模块详解](#模块详解)
4. [工作流程](#工作流程)
5. [遗传进化算法](#遗传进化算法)
6. [主动进化机制](#主动进化机制)
7. [数据流图](#数据流图)
8. [配置参数](#配置参数)

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OpenClaw Gateway                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SEAM Extension                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   TechAware  │  │  Proactive   │  │   Evolution  │              │   │
│  │  │   科技感知    │  │  Explorer    │  │   Planner    │              │   │
│  │  │              │  │  主动探索     │  │  进化规划器   │              │   │
│  │  │ • 扫描趋势    │  │              │  │              │              │   │
│  │  │ • 识别缺口    │  │ • 寻找机会    │  │ • 检测瓶颈    │              │   │
│  │  │ • 生成建议    │  │ • 运行实验    │  │ • 制定策略    │              │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │   │
│  │         │                 │                 │                       │   │
│  │         └─────────────────┼─────────────────┘                       │   │
│  │                           ▼                                         │   │
│  │              ┌─────────────────────────┐                           │   │
│  │              │    SelfEvolvingMesh     │                           │   │
│  │              │      网格核心控制器      │                           │   │
│  │              │                         │                           │   │
│  │              │  ┌───────────────────┐  │                           │   │
│  │              │  │   MeshEventBus    │  │ ◄── 智能体通信总线        │   │
│  │              │  │   (EventEmitter)  │  │                           │   │
│  │              │  └───────────────────┘  │                           │   │
│  │              │                         │                           │   │
│  │              │  ┌─────────────────────┐│                           │   │
│  │              │  │    Agent 种群       ││                           │   │
│  │              │  │  ┌───┐┌───┐┌───┐   ││                           │   │
│  │              │  │  │ O ││ R ││ E │   ││ ◄── 5种智能体类型         │   │
│  │              │  │  │ R ││ E ││ X │   ││    O=Orchestrator(编排者) │   │
│  │              │  │  │ C ││ S ││ E │   ││    R=Researcher(研究员)   │   │
│  │              │  │  │ H ││ E ││ C │   ││    E=Executor(执行者)     │   │
│  │              │  │  │   ││ A ││ U │   ││    V=Validator(验证者)    │   │
│  │              │  │  │ V ││ R ││ T │   ││    V=Evolver(进化者)      │   │
│  │              │  │  │ A ││ C ││ O │   ││                           │   │
│  │              │  │  │ L ││ H ││ R │   ││    每个智能体都有 DNA      │   │
│  │              │  │  │ I ││ E ││   │   ││    └── 遗传信息           │   │
│  │              │  │  │ D ││ R ││ V │   ││        • 能力基因         │   │
│  │              │  │  └───┘└───┘└───┘   ││        • 行为基因         │   │
│  │              │  └─────────────────────┘│        • 适应度评分       │   │
│  │              └─────────────────────────┘                           │   │
│  │                           ▲                                         │   │
│  │                           │                                         │   │
│  │              ┌─────────────────────────┐                           │   │
│  │              │      Task Queue         │                           │   │
│  │              │      (任务队列)          │                           │   │
│  │              └─────────────────────────┘                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                        │
│                                    │                                        │
│                         ┌──────────┴──────────┐                            │
│                         │    Plugin Bridge    │                            │
│                         │  (OpenClaw 插件接口) │                            │
│                         └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 核心概念

### 1. Agent DNA (智能体基因)

每个智能体都有遗传信息，决定了它的能力和行为：

```typescript
interface AgentDNA {
  id: string;                    // 唯一标识
  generation: number;            // 所属世代
  parentIds: string[];           // 父母ID（遗传溯源）
  createdAt: Date;               // 创建时间

  capabilities: Capability[];    // 能力基因
  behavior: BehaviorGene;        // 行为基因
  fitness?: FitnessScore;        // 适应度评分
}

interface Capability {
  name: string;                  // 能力名称
  level: number;                 // 能力等级 (0-1)
  description: string;           // 能力描述
}

interface BehaviorGene {
  promptTemplate: string;        // Prompt 模板
  temperature: number;           // 温度参数 (0-2)
  maxTokens: number;             // 最大Token数
  tools: string[];               // 可用工具列表
}
```

### 2. Fitness Score (适应度评分)

衡量智能体的表现，决定是否能存活和繁殖：

```typescript
interface FitnessScore {
  successRate: number;           // 任务成功率
  avgResponseTime: number;       // 平均响应时间
  collaborationScore: number;    // 协作评分
  overall: number;               // 综合评分 (0-1)
}

// 综合评分计算公式
overall = (
  successRate * 0.4 +            // 成功率权重 40%
  (1 - avgResponseTime/5000) * 0.3 +  // 响应时间权重 30%
  collaborationScore * 0.3        // 协作评分权重 30%
)
```

### 3. Agent Type (智能体类型)

| 类型 | 职责 | 默认能力 |
|------|------|----------|
| **Orchestrator** | 任务分析和分配 | task-analysis, complexity-assessment |
| **Researcher** | 信息收集和研究 | information-gathering, fact-checking |
| **Executor** | 执行任务 | code-execution, tool-use |
| **Validator** | 结果验证 | output-validation, quality-check |
| **Evolver** | 管理进化 | evolution-planning, dna-optimization |

---

## 模块详解

### Utils (共享工具模块)

**文件**: `src/utils.ts`

**作用**: 提供项目共享的工具函数，避免代码重复

**功能列表**:
```typescript
// 生成唯一ID
function generateId(prefix?: string): string

// 异步延迟
function sleep(ms: number): Promise<void>

// 创建可解析的Promise（用于事件驱动架构）
function createResolvablePromise<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

// 计数数组元素出现次数
function countOccurrences<T>(arr: T[]): Map<T, number>

// 限制数组大小，防止内存泄漏
function limitArraySize<T>(arr: T[], maxSize: number): T[]
```

**使用场景**:
- 任务结果的事件驱动等待
- ID 生成统一化
- 数据统计和监控
- 内存管理

---

### MeshEventBus (网格事件总线)

**作用**：智能体之间的通信基础设施

**事件类型**：
```typescript
type MessageType = 'task' | 'result' | 'evolution' | 'heartbeat';

interface MeshMessage {
  id: string;
  type: MessageType;
  sender: string;           // 发送者ID
  receiver: string | 'broadcast';  // 接收者ID或广播
  payload: unknown;         // 消息内容
  timestamp: number;
}
```

**工作流程**：
1. 智能体发布消息到总线
2. 总线根据 receiver 路由消息
3. 接收者处理消息后可选回复
4. 所有消息被记录用于适应度计算

### EvolutionPlanner (进化规划器)

**作用**：分析系统状态，制定进化策略

**瓶颈检测算法**：
```typescript
function analyzeBottlenecks(state: SystemState): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  // 1. 队列积压检测
  if (state.queueLength > state.agentCount * 2) {
    bottlenecks.push({
      type: 'queue_backlog',
      severity: calculateSeverity(state.queueLength / state.agentCount),
      description: `队列积压: ${state.queueLength} 个任务等待`,
      affectedAgents: ['executor'],
      metrics: { queueLength: state.queueLength }
    });
  }

  // 2. 成功率检测
  if (state.metrics.successRate < 0.8) {
    bottlenecks.push({
      type: 'low_success_rate',
      severity: 'high',
      description: `成功率低于80%: ${(state.metrics.successRate * 100).toFixed(1)}%`,
      affectedAgents: ['validator', 'executor'],
      metrics: { successRate: state.metrics.successRate }
    });
  }

  // 3. 延迟检测
  if (state.metrics.avgResponseTime > 2000) {
    bottlenecks.push({
      type: 'high_latency',
      severity: 'medium',
      description: `平均响应时间过长`,
      affectedAgents: Object.keys(state.agentsByType) as AgentType[],
      metrics: { avgResponseTime: state.metrics.avgResponseTime }
    });
  }

  // 4. 类型不均衡检测
  const distribution = calculateTypeDistribution(state.agentsByType);
  if (distribution.entropy < 0.7) {
    bottlenecks.push({
      type: 'type_imbalance',
      severity: 'low',
      description: '智能体类型分布不均衡',
      affectedAgents: findUnderrepresentedTypes(state.agentsByType),
      metrics: { distribution }
    });
  }

  return bottlenecks;
}
```

**策略生成**：
```typescript
function generateStrategies(bottlenecks: Bottleneck[]): EvolutionStrategy[] {
  const strategies: EvolutionStrategy[] = [];

  for (const bottleneck of bottlenecks) {
    switch (bottleneck.type) {
      case 'queue_backlog':
        strategies.push({
          name: '增加执行者',
          target: 'spawn',
          agentType: 'executor',
          priority: bottleneck.severity === 'critical' ? 10 : 7,
          expectedImpact: { metric: 'queueLength', improvement: -50 },
          reasoning: '队列积压，需要更多执行者'
        });
        break;

      case 'low_success_rate':
        strategies.push({
          name: '强化验证者',
          target: 'spawn',
          agentType: 'validator',
          priority: 9,
          expectedImpact: { metric: 'successRate', improvement: 15 },
          reasoning: '成功率低，需要更多验证'
        });
        break;

      // ... 其他策略
    }
  }

  // 按优先级排序
  return strategies.sort((a, b) => b.priority - a.priority);
}
```

### TechAwareness (科技感知模块)

**作用**：感知外部技术世界，识别能力缺口

**运行周期**：每 60 分钟扫描一次

**趋势扫描流程**：
```
定时触发
    ↓
扫描模拟科技源
    ↓
生成趋势数据
    ↓
计算与系统相关度
    ↓
存储高相关度趋势
    ↓
分析能力缺口
    ↓
生成进化建议
```

**能力缺口分析**：
```typescript
function analyzeCapabilityGap(agents: AgentDNA[], trends: TechTrend[]): CapabilityGap[] {
  const gaps: CapabilityGap[] = [];

  for (const trend of trends) {
    if (trend.relevance < 0.7) continue;

    // 检查当前智能体是否具备相关能力
    const hasCapability = agents.some(agent =>
      agent.capabilities.some(cap =>
        cap.name.toLowerCase().includes(trend.category) ||
        cap.description.toLowerCase().includes(trend.title.toLowerCase())
      )
    );

    if (!hasCapability && trend.impact !== 'low') {
      gaps.push({
        capability: `${trend.category}-awareness`,
        currentLevel: 0,
        requiredLevel: trend.impact === 'critical' ? 0.9 : 0.7,
        urgency: trend.impact === 'critical' ? 'high' : 'medium',
        relatedTrends: [trend.id]
      });
    }
  }

  return gaps;
}
```

### ProactiveExplorer (主动探索器)

**作用**：主动寻找进化机会，而非被动等待瓶颈

**运行周期**：每 20 分钟探索一次

**内存管理**:
```typescript
private readonly maxOpportunities = 50;   // 最大机会数
private readonly maxExperiments = 100;    // 最大实验数

private cleanupOldData(): void {
  this.opportunities = limitArraySize(this.opportunities, this.maxOpportunities);
  this.experiments = limitArraySize(this.experiments, this.maxExperiments);
}
```

每次探索周期后自动清理旧数据，防止内存泄漏。

**探索来源**：

1. **技术趋势驱动**
   - 监控 TechAwareness 的高影响趋势
   - 为关键趋势创建专项进化机会

2. **能力缺口驱动**
   - 识别系统能力短板
   - 例如：并行处理、记忆共享、负载均衡

3. **好奇心驱动**
   - 随机尝试新组合
   - 探索未知策略空间

**机会评估公式**：
```typescript
// 综合评分 = 潜力 × (1 - 风险) / 所需资源
score = opportunity.potential * (1 - opportunity.risk) / opportunity.requiredResources;

// 评估维度
interface ExplorationOpportunity {
  potential: number;      // 0-1 潜在价值
  risk: number;           // 0-1 风险程度
  requiredResources: number;  // 所需资源
  expectedOutcome: {
    capabilityIncrease: number;
    efficiencyGain: number;
    newAbilities: string[];
  };
}
```

**实验验证流程**：
```
发现机会
    ↓
创建小实验
    ↓
5分钟小规模测试
    ↓
收集指标 (成功率/响应时间/资源使用)
    ↓
实验成功? → 加入进化计划
实验失败? → 记录并丢弃
```

---

## 工作流程

### 1. 初始化流程

```
SelfEvolvingMesh.initialize()
    ↓
创建 MeshEventBus
    ↓
初始化 EvolutionPlanner
    ↓
初始化 TechAwareness（启动定时扫描）
    ↓
初始化 ProactiveExplorer（启动定时探索）
    ↓
创建 Genesis Agents（初始种群）
    ↓
启动 Evolution Loop（定时进化）
    ↓
状态: RUNNING
```

### 2. 任务处理流程

```
用户发送消息
    ↓
Plugin.onMessage() 接收
    ↓
Orchestrator.analyzeTask() 分析复杂度
    ↓
    ├─ simple → 分配给 Executor
    ├─ medium → Researcher 研究 + Executor 执行
    └─ complex → 多智能体协作流程
    ↓
选定智能体 executeTask()
    ↓
Validator.validate() 验证结果
    ↓
更新执行者适应度
    ↓
通知等待者（事件驱动）
    ↓
返回结果给用户
```

**性能优化说明**:
任务结果获取机制从"轮询检查"改为"事件通知":
- **旧方式**: `getResult()` 每 100ms 轮询一次 `results` Map
- **新方式**: 使用 `resultWaiters` Map 存储等待回调，结果就绪时主动 `notifyResultWaiters()`
- **收益**:
  - 降低 CPU 占用（消除忙等待）
  - 提高响应速度（即时通知替代定时轮询）
  - 更好的可扩展性

实现代码:
```typescript
// 等待结果（非阻塞）
async getResult(taskId: string, timeoutMs = 30000): Promise<TaskResult | null> {
  // 检查结果是否已存在
  const existing = this.results.get(taskId);
  if (existing) return existing;

  // 创建可解析的 Promise
  const { promise, resolve } = createResolvablePromise<TaskResult | null>();

  // 注册等待器
  if (!this.resultWaiters.has(taskId)) {
    this.resultWaiters.set(taskId, []);
  }
  this.resultWaiters.get(taskId)!.push({ resolve, reject: () => resolve(null) });

  // 设置超时
  setTimeout(() => resolve(null), timeoutMs);
  return promise;
}

// 通知等待者
private notifyResultWaiters(taskId: string, result: TaskResult): void {
  const waiters = this.resultWaiters.get(taskId);
  if (waiters) {
    for (const { resolve } of waiters) {
      resolve(result);
    }
    this.resultWaiters.delete(taskId);
  }
}
```

### 3. 进化周期流程

```
定时触发（默认6小时）
    ↓
collectSystemState()
    ↓
planner.shouldEvolve(state)?
    ├─ No → 跳过本次进化
    └─ Yes → continue
    ↓
planner.createEvolutionPlan(state)
    ↓
executeEvolutionPlan(plan)
    ↓
对每个策略:
    ├─ spawn → spawnAgent()
    ├─ mutate → mutateAgent()
    ├─ merge → mergeAgents()
    ├─ rebalance → rebalanceLoad()
    └─ retire → retireAgent()
    ↓
更新世代计数
    ↓
记录进化历史
```

---

## 遗传进化算法

### 选择 (Selection)

**轮盘赌选择**：适应度越高，被选中的概率越大

```typescript
function selectParents(agents: Agent[], count: number): Agent[] {
  // 只选择有适应度评分的智能体
  const eligible = agents.filter(a => a.dna.fitness);

  // 计算总适应度
  const totalFitness = eligible.reduce((sum, a) =>
    sum + (a.dna.fitness?.overall || 0), 0
  );

  const parents: Agent[] = [];

  for (let i = 0; i < count; i++) {
    let random = Math.random() * totalFitness;
    let cumulative = 0;

    for (const agent of eligible) {
      cumulative += agent.dna.fitness?.overall || 0;
      if (random <= cumulative) {
        parents.push(agent);
        break;
      }
    }
  }

  return parents;
}
```

### 繁殖 (Reproduction)

**交叉操作**：组合父母双方的基因

```typescript
function reproduce(parents: Agent[], type: AgentType): AgentDNA {
  const parent1 = parents[0];
  const parent2 = parents[1] || parents[0];

  return {
    id: generateId(),
    generation: Math.max(parent1.dna.generation, parent2.dna.generation) + 1,
    parentIds: [parent1.id, parent2.id],
    createdAt: new Date(),

    // 能力基因：交叉
    capabilities: crossoverCapabilities(
      parent1.dna.capabilities,
      parent2.dna.capabilities
    ),

    // 行为基因：交叉
    behavior: crossoverBehavior(
      parent1.dna.behavior,
      parent2.dna.behavior
    ),

    fitness: undefined  // 新个体无适应度
  };
}

function crossoverCapabilities(cap1: Capability[], cap2: Capability[]): Capability[] {
  const allCapabilities = [...cap1, ...cap2];
  const uniqueNames = [...new Set(allCapabilities.map(c => c.name))];

  return uniqueNames.map(name => {
    const c1 = cap1.find(c => c.name === name);
    const c2 = cap2.find(c => c.name === name);

    if (c1 && c2) {
      // 双方都有的能力，取平均值 + 小幅提升（杂交优势）
      return {
        name,
        level: Math.min(1, (c1.level + c2.level) / 2 * 1.05),
        description: c1.description
      };
    }
    // 只有一方有的能力，继承
    return c1 || c2!;
  });
}
```

### 突变 (Mutation)

**随机变异**：引入新的基因变异

```typescript
function mutate(dna: AgentDNA, mutationRate: number): AgentDNA {
  const mutated: AgentDNA = { ...dna };

  // 1. 能力突变
  mutated.capabilities = dna.capabilities.map(cap => {
    if (Math.random() < mutationRate) {
      return {
        ...cap,
        level: Math.max(0, Math.min(1, cap.level + (Math.random() - 0.5) * 0.2))
      };
    }
    return cap;
  });

  // 2. 行为基因突变
  mutated.behavior = { ...dna.behavior };

  if (Math.random() < mutationRate) {
    mutated.behavior.temperature = Math.max(0, Math.min(2,
      dna.behavior.temperature + (Math.random() - 0.5) * 0.2
    ));
  }

  if (Math.random() < mutationRate) {
    mutated.behavior.maxTokens = Math.max(100,
      dna.behavior.maxTokens + Math.floor((Math.random() - 0.5) * 500)
    );
  }

  // 3. 新增能力（低概率）
  if (Math.random() < mutationRate * 0.3) {
    const newCapability = generateRandomCapability();
    if (!mutated.capabilities.find(c => c.name === newCapability.name)) {
      mutated.capabilities.push(newCapability);
    }
  }

  return mutated;
}
```

---

## 主动进化机制

### 被动进化 vs 主动进化

| 维度 | 被动进化 | 主动进化 |
|------|---------|---------|
| **触发条件** | 出现问题（瓶颈） | 发现机会 |
| **响应时间** | 滞后 | 前瞻 |
| **进化目标** | 修复缺陷 | 提升能力 |
| **信息来源** | 内部指标 | 外部趋势 + 内部数据 |

### 主动进化三支柱

```
┌─────────────────────────────────────────────────────┐
│                   主动进化系统                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌──────────────┐   ┌──────────────┐              │
│   │ TechAwareness│   │   Proactive  │              │
│   │   科技感知    │   │  Explorer    │              │
│   └──────┬───────┘   └──────┬───────┘              │
│          │                  │                       │
│          ▼                  ▼                       │
│   ┌────────────────────────────────┐               │
│   │      Evolution Opportunity     │               │
│   │         进化机会池              │               │
│   └──────────────┬─────────────────┘               │
│                  │                                 │
│                  ▼                                 │
│   ┌────────────────────────────────┐               │
│   │     Experiment Validation      │               │
│   │         实验验证                │               │
│   └──────────────┬─────────────────┘               │
│                  │                                 │
│                  ▼                                 │
│   ┌────────────────────────────────┐               │
│   │   Integration to EvolutionPlan │               │
│   │      整合到进化计划             │               │
│   └────────────────────────────────┘               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 机会优先级排序

```typescript
// 多因素排序
opportunities.sort((a, b) => {
  // 1. 紧急度 (高影响趋势)
  const urgencyA = a.trigger === 'tech-trend' && a.potential > 0.8 ? 2 : 0;
  const urgencyB = b.trigger === 'tech-trend' && b.potential > 0.8 ? 2 : 0;

  // 2. 综合评分
  const scoreA = a.potential * (1 - a.risk) / a.requiredResources;
  const scoreB = b.potential * (1 - b.risk) / b.requiredResources;

  // 3. 资源效率
  const efficiencyA = a.expectedOutcome.capabilityIncrease / a.requiredResources;
  const efficiencyB = b.expectedOutcome.capabilityIncrease / b.requiredResources;

  return (urgencyB + scoreB + efficiencyB) - (urgencyA + scoreA + efficiencyA);
});
```

---

## 数据流图

### 完整数据流

```
┌──────────┐     Task      ┌──────────────┐
│   User   │──────────────▶│    Plugin    │
└──────────┘               └──────┬───────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  SelfEvolvingMesh │
                         │   submitTask()    │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌─────────┐   ┌──────────┐   ┌──────────┐
              │Orchestr │   │  Queue   │   │ Evolution│
              │ -ator   │   │          │   │  Loop    │
              └────┬────┘   └──────────┘   └────┬─────┘
                   │                              │
                   ▼                              │
              ┌─────────┐                         │
              │ Research│◀────────────────────────┤
              │ -er     │   adapt capabilities    │
              └────┬────┘                         │
                   │                              │
                   ▼                              │
              ┌─────────┐                         │
              │ Executor│                         │
              └────┬────┘                         │
                   │                              │
                   ▼                              │
              ┌─────────┐   update fitness       │
              │Validator│────────────────────────┘
              └────┬────┘
                   │
                   ▼ Result
┌──────────┐  ┌──────────────┐
│   User   │◀─┤    Plugin    │
└──────────┘  └──────────────┘
```

### 进化数据流

```
System Metrics
      │
      ▼
┌─────────────┐    Bottlenecks    ┌─────────────┐
│  Evolution  │──────────────────▶│   Create    │
│   Planner   │                   │    Plan     │
└──────┬──────┘                   └──────┬──────┘
       │                                 │
       │ Opportunities                   │ Strategies
       │                                 ▼
       │                        ┌─────────────┐
       │                        │   Execute   │
       │                        │   Plan()    │
       │                        └──────┬──────┘
       │                               │
       │         ┌─────────────────────┼─────────────────────┐
       │         │                     │                     │
       │         ▼                     ▼                     ▼
       │   ┌─────────┐          ┌─────────┐          ┌─────────┐
       │   │  Spawn  │          │ Mutate  │          │  Merge  │
       │   │  Agent  │          │  Agent  │          │ Agents  │
       │   └────┬────┘          └────┬────┘          └────┬────┘
       │        │                    │                    │
       │        └────────────────────┼────────────────────┘
       │                             │
       │                             ▼
       │                      ┌─────────────┐
       │                      │  New Agent  │
       │                      │    DNA      │
       │                      └──────┬──────┘
       │                             │
       │                             ▼
       │                      ┌─────────────┐
       │                      │ Add to Mesh │
       │                      └─────────────┘
       │
       ▼
┌─────────────┐
│   Update    │
│   History   │
└─────────────┘
```

---

## 配置参数

### 完整配置示例

```yaml
# ~/.openclaw/config.yaml

extensions:
  - path: ./extensions/openclaw-mesh
    enabled: true

mesh:
  # 自动启动
  autoStart: true

  # 初始智能体配置
  genesisAgents:
    - type: orchestrator
      count: 1
    - type: researcher
      count: 2
    - type: executor
      count: 3
    - type: validator
      count: 1
    - type: evolver
      count: 1

  # 进化配置
  evolution:
    enabled: true
    intervalMinutes: 360        # 进化周期（6小时）
    selectionPressure: 0.3      # 选择压力（0-1）
    mutationRate: 0.2           # 突变率（0-1）
    minPopulation: 5            # 最小种群数
    maxPopulation: 20           # 最大种群数
    retirementThreshold: 0.3    # 退休阈值（适应度低于此值）

  # 科技感知配置
  techAwareness:
    enabled: true
    scanIntervalMinutes: 60     # 扫描间隔
    maxTrends: 100              # 最大存储趋势数
    relevanceThreshold: 0.7     # 相关度阈值

  # 主动探索配置
  proactiveExplorer:
    enabled: true
    explorationIntervalMinutes: 20  # 探索间隔
    experimentDurationMinutes: 5    # 实验时长
    maxOpportunities: 10            # 最大机会数
    curiosityRate: 0.3              # 好奇心率（随机探索概率）
```

### 参数调优指南

| 参数 | 默认值 | 调大影响 | 调小影响 |
|------|-------|---------|---------|
| `intervalMinutes` | 360 | 进化更频繁，适应更快 | 系统更稳定，资源消耗少 |
| `selectionPressure` | 0.3 | 强者更强，收敛更快 | 多样性保留，避免局部最优 |
| `mutationRate` | 0.2 | 探索更多，可能发现更好解 | 稳定性高，收敛更快 |
| `curiosityRate` | 0.3 | 更多随机探索，创新性强 | 更务实，基于数据决策 |

---

## 监控与调试

### 日志追踪

```bash
# 查看 Mesh 相关日志
tail -f ~/.openclaw/logs/gateway.log | grep -E "SEAM|Mesh|Evolution|Agent"

# 查看特定智能体活动
tail -f ~/.openclaw/logs/gateway.log | grep "agent-<id>"

# 查看进化历史
tail -f ~/.openclaw/logs/gateway.log | grep "Evolution cycle"
```

### 状态查询

```bash
# 网格整体状态
openclaw agent --message "网格状态"

# 智能体列表
openclaw agent --message "智能体列表"

# 当前进化计划
openclaw agent --message "进化计划"

# 科技趋势
openclaw agent --message "科技趋势"

# 探索报告
openclaw agent --message "探索报告"
```

---

## 总结

SEAM 是一个**仿生智能系统**，借鉴了以下生物和社会学概念：

1. **遗传算法** - 智能体有 DNA，通过选择、交叉、突变进化
2. **群体智能** - 多智能体协作，涌现群体智慧
3. **自然选择** - 适应度决定生存，优胜劣汰
4. **主动学习** - 像科学家一样主动探索未知
5. **环境感知** - 感知外部技术趋势，与时俱进

系统核心循环：**感知 → 决策 → 执行 → 进化**
