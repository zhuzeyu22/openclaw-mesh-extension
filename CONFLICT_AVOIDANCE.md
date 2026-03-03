# SEAM 冲突避免说明

本文档说明 SEAM (Self-Evolving Agent Mesh) 插件如何避免与 OpenClaw 上其他 Agent 的冲突。

---

## 潜在冲突点

| 冲突类型 | 风险 | 解决方案 |
|---------|------|---------|
| **Agent ID 命名空间** | 低 | 添加 `seam-` 前缀 |
| **消息路由冲突** | 高 | 显式调用前缀 (`@mesh`/`@seam`) |
| **资源竞争** | 中 | 可配置定时器频率 |
| **配置键冲突** | 低 | 支持 `seam` 和 `mesh` 双键 |

---

## 已实现的冲突避免措施

### 1. Agent ID 命名空间隔离

所有 Mesh 内部的 Agent ID 都添加了 `seam-` 前缀：

```typescript
// mesh.ts
const agent: Agent = {
  id: `seam-${type}-${dna.id.slice(0, 8)}`,
  // 例如: seam-executor-a1b2c3d4
};
```

这样即使 OpenClaw 或其他 Agent 系统需要引用这些 Agent，也不会与其他 ID 冲突。

### 2. 消息拦截控制

**默认行为**：不拦截任何自然语言消息，完全避免与其他 Agent 冲突。

```yaml
# config.yaml
seam:
  # 默认 false，避免冲突
  interceptMessages: false
```

**显式调用**：用户需要使用前缀主动调用：

```
@mesh 网格状态
@seam 研究这个问题
@网格 智能体列表
[use mesh] 分析数据
```

**自动拦截（不推荐）**：如果确实需要自动拦截，可以开启：

```yaml
seam:
  interceptMessages: true
  # 将自动拦截包含以下关键词的消息：
  # 研究、分析、开发、复杂
```

### 3. 配置键兼容

支持新旧两种配置键，向后兼容：

```typescript
// plugin.ts
const seamConfig = context.config.get('seam');
const meshConfig = context.config.get('mesh');
const userConfig = seamConfig || meshConfig || {};
```

**推荐使用 `seam`**：

```yaml
seam:
  autoStart: true
  interceptMessages: false
```

### 4. 技能标识更新

```typescript
// plugin.ts
class MeshSkill implements Skill {
  name = 'seam';  // 从 'mesh' 改为 'seam'
  description = '自我进化智能体网格 (SEAM) - 使用 @mesh/@seam 调用';
}
```

---

## 使用建议

### 场景 1：与其他 Agent 共存（推荐）

```yaml
# config.yaml
seam:
  interceptMessages: false  # 不自动拦截消息
```

使用方式：
```
@mesh help              # 查看帮助
@mesh 网格状态          # 查看状态
@seam 研究这个问题      # 提交任务
```

### 场景 2：独立使用（无其他 Agent）

```yaml
# config.yaml
seam:
  interceptMessages: true  # 自动拦截复杂任务
```

使用方式：
```
研究 AI 安全            # 自动被 Mesh 处理
分析这个代码            # 自动被 Mesh 处理
网格状态               # 直接识别
```

### 场景 3：工具调用（最可靠）

无论 `interceptMessages` 设置如何，以下命令始终可用：

```bash
# 查看状态
openclaw tools call mesh_status

# 提交任务
openclaw tools call mesh_submit '{"description": "研究 AI 安全", "complexity": "complex"}'

# 触发进化
openclaw tools call mesh_evolve
```

---

## 故障排除

### 问题 1：Mesh 不响应消息

**原因**：默认 `interceptMessages: false`，需要使用前缀。

**解决**：
```
@mesh 网格状态    # ✅ 正确
网格状态          # ❌ 不会响应（除非开启 interceptMessages）
```

### 问题 2：与其他 Agent 同时响应

**原因**：可能设置了 `interceptMessages: true`，且消息包含触发词。

**解决**：
1. 关闭自动拦截：`interceptMessages: false`
2. 使用显式前缀调用 Mesh
3. 或使用工具调用方式

### 问题 3：找不到 Mesh Agent

**原因**：Agent ID 已添加 `seam-` 前缀。

**解决**：
```bash
# 查看 Agent 列表
openclaw agent --message "@mesh 智能体列表"

# 应该显示 ID 为 seam-executor-xxx, seam-researcher-xxx 等
```

---

## 配置模板

### 最小化配置（最安全，推荐）

```yaml
extensions:
  - path: ./extensions/openclaw-mesh
    enabled: true

seam:
  autoStart: true
  interceptMessages: false
```

### 完整配置

```yaml
seam:
  autoStart: true
  interceptMessages: false  # 默认不拦截，避免冲突

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

  evolution:
    enabled: true
    intervalMinutes: 360      # 6小时进化周期
    selectionPressure: 0.3
    mutationRate: 0.2

  techAwareness:
    enabled: true
    scanIntervalMinutes: 60   # 科技趋势扫描间隔

  proactiveExplorer:
    enabled: true
    explorationIntervalMinutes: 20  # 主动探索间隔
```

---

## 总结

SEAM 插件通过以下设计确保与其他 Agent 和谐共存：

1. **命名空间隔离**：Agent ID 加 `seam-` 前缀
2. **显式调用优先**：默认需要 `@mesh`/`@seam` 前缀
3. **可配置拦截**：`interceptMessages` 控制是否自动拦截
4. **配置键兼容**：支持 `seam` 和 `mesh` 配置键

**最佳实践**：
- 多 Agent 环境：使用 `interceptMessages: false` + 显式调用
- 单 Agent 环境：可根据需要开启 `interceptMessages: true`
- 编程调用：使用工具命令（`mesh_submit` 等），最可靠
