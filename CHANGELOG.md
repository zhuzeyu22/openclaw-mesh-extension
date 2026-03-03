# 变更日志

所有重要的变更都会记录在此文件中。

## [1.0.1] - 2026-03-03

### 新增
- **共享工具模块** (`src/utils.ts`)
  - `generateId()` - 统一生成带前缀的唯一ID
  - `sleep()` - 异步延迟函数
  - `createResolvablePromise()` - 创建可外部解析的Promise
  - `countOccurrences()` - 统计数组元素出现次数
  - `limitArraySize()` - 限制数组大小防止内存泄漏

### 优化
- **性能优化** (`src/mesh.ts`)
  - 将 `getResult()` 从忙等待轮询改为事件驱动模式
  - 新增 `resultWaiters` Map 存储等待回调
  - 新增 `notifyResultWaiters()` 方法主动通知结果
  - 减少CPU占用，提高响应速度

- **内存管理** (`src/proactive-explorer.ts`)
  - 添加 `maxOpportunities` 限制（默认50）
  - 添加 `maxExperiments` 限制（默认100）
  - 新增 `cleanupOldData()` 方法定期清理旧数据

- **代码复用**
  - `evolution-planner.ts`: 移除重复的 `generateId()` 和 `countOccurrences()`
  - `mesh.ts`: 移除重复的 `generateId()` 和 `sleep()`
  - `proactive-explorer.ts`: 使用共享工具函数
  - `tech-awareness.ts`: 使用共享的 `generateId()`

### 改进
- **类型安全**
  - `evolution-planner.ts`: `analyzeDistribution()` 改用 `Map` 替代 `Record`
  - `evolution-planner.ts`: 修复 `lowPerformers` 的类型推断（移除 `any`）
  - `mesh.ts`: 修复 `executeTask()` 中变量类型问题

### 技术细节

#### 事件驱动架构变更
```typescript
// 优化前: 忙等待轮询
async getResult(taskId: string, timeoutMs = 30000): Promise<TaskResult | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const result = this.results.get(taskId);
    if (result) return result;
    await this.sleep(100);  // 每100ms检查一次
  }
  return null;
}

// 优化后: 事件驱动
async getResult(taskId: string, timeoutMs = 30000): Promise<TaskResult | null> {
  const existing = this.results.get(taskId);
  if (existing) return existing;

  const { promise, resolve } = createResolvablePromise<TaskResult | null>();
  // 注册等待器...
  setTimeout(() => resolve(null), timeoutMs);
  return promise;
}
```

#### 内存管理改进
```typescript
// 优化前: 数组无限增长
private opportunities: ExplorationOpportunity[] = [];
private experiments: Experiment[] = [];

// 优化后: 自动清理
private readonly maxOpportunities = 50;
private readonly maxExperiments = 100;

private cleanupOldData(): void {
  this.opportunities = limitArraySize(this.opportunities, this.maxOpportunities);
  this.experiments = limitArraySize(this.experiments, this.maxExperiments);
}
```

## [1.0.0] - 初始版本

### 功能
- 🤖 5种智能体类型：协调者、研究者、执行者、验证者、进化者
- 🧬 遗传进化：智能体具有可进化的"DNA"
- 🧠 智能进化规划：自动分析瓶颈，制定进化策略
- 🔄 自动协作：复杂任务自动分解分配
- 📊 负载均衡：智能任务分配和故障转移
- 🎯 自适应：每30秒检查系统状态，智能触发进化
- 🔮 预测能力：基于历史预测未来需求
- 📡 科技感知：扫描技术趋势，识别能力缺口
- 🔬 主动探索：主动寻找进化机会，运行验证实验

### 模块
- `SelfEvolvingMesh` - 网格核心控制器
- `EvolutionPlanner` - 智能进化规划器
- `TechAwareness` - 科技趋势感知
- `ProactiveExplorer` - 主动探索器
- `MeshSkill` - OpenClaw 插件接口
