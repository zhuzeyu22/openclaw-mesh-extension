# SEAM 与 OpenClaw 交互机制详解

## 概述

SEAM 作为 OpenClaw 的扩展，通过**插件接口**与 OpenClaw 核心系统交互。根据 OpenClaw 版本不同，有两种交互模式：

1. **插件模式** (OpenClaw 2026.3.0+) - 通过标准插件 SDK 集成
2. **独立模式** (OpenClaw 2026.2.x) - 作为独立服务运行

---

## 一、插件模式交互 (2026.3.0+)

### 1.1 生命周期交互

```
OpenClaw Gateway
      │
      ├─ 1. 加载扩展 ──────────────────────▶
      │                                         │
      │  2. 调用 initialize(context)           │
      │◀──────────────────────────────────────┤
      │                                         │
      │  ┌─────────────────────────────────┐   │
      │  │     SEAM Plugin (MeshSkill)     │   │
      │  │                                 │   │
      │  │  ┌─────────────────────────┐   │   │
      │  │  │   SelfEvolvingMesh      │   │   │
      │  │  │                         │   │   │
      │  │  │  ┌─────┐ ┌─────┐ ┌───┐ │   │   │
      │  │  │  │Agent│ │Agent│ │...│ │   │   │
      │  │  │  └─────┘ └─────┘ └───┘ │   │   │
      │  │  └─────────────────────────┘   │   │
      │  └─────────────────────────────────┘   │
      │                                         │
      │  运行期间交互...                         │
      │  ───────────────────────────────────▶  │
      │◀───────────────────────────────────────┤
      │                                         │
      ├─ 3. 调用 destroy() ──────────────────▶
      │                                         │
      │  4. 清理资源                            │
      │◀──────────────────────────────────────┤
      │
```

### 1.2 初始化交互 (initialize)

```typescript
// OpenClaw 调用插件初始化
async initialize(context: Context): Promise<void> {
  // 1. 从 OpenClaw 读取配置
  const seamConfig = context.config.get('seam');
  // 例如: { genesisAgents: [...], evolution: {...} }

  // 2. 创建 SEAM 网格
  this.mesh = new SelfEvolvingMesh(config);

  // 3. 启动网格（创建智能体）
  await this.mesh.start();

  // 4. 输出日志到 OpenClaw
  console.log('[SEAM Plugin] Initialized');
}
```

**配置流向：**
```
openclaw.json
    │
    ├─ "seam": {              ◄── 用户配置
    │    ├─ "genesisAgents": [...]
    │    └─ "evolution": {...}
    │  }
    │
    ▼
context.config.get('seam')    ◄── OpenClaw 读取
    │
    ▼
MeshSkill.initialize()        ◄── 插件接收配置
    │
    ▼
SelfEvolvingMesh(config)      ◄── 创建网格
```

### 1.3 消息交互 (onMessage)

#### 方式 1：显式调用

用户通过前缀显式调用 SEAM：

```
用户输入: "@mesh 研究 TypeScript 性能优化"
                │
                ▼
OpenClaw 路由 ──▶ MeshSkill.onMessage()
                │
                ▼
          解析消息
                │
                ├─ 识别 @mesh 前缀
                ├─ 提取命令: "研究 TypeScript 性能优化"
                ├─ 提交任务给网格
                │   └─ Orchestrator → Researcher → Executor
                └─ 返回结果给用户
```

**代码流程：**
```typescript
async onMessage(message: string, context: Context): Promise<string | null> {
  // 1. 检查是否是显式调用
  const isExplicitCall = message.startsWith('@mesh') ||
                          message.startsWith('@seam');

  if (!isExplicitCall && !this.config.interceptMessages) {
    return null; // 让给其他 agent 处理
  }

  // 2. 解析命令
  const command = message.replace(/^@mesh\s*/, '');

  // 3. 提交任务到网格
  const task = await this.mesh.submitTask(command, {
    complexity: 'medium'
  });

  // 4. 等待结果
  const result = await this.mesh.getResult(task.id);

  // 5. 返回给 OpenClaw
  return `任务完成: ${result.output}`;
}
```

#### 方式 2：工具调用

用户通过 `/` 命令调用：

```
用户输入: "/mesh_submit 描述=研究 AI 安全 复杂度=complex"
                │
                ▼
OpenClaw ──────▶ MeshSkill.getTools()
                │
                ├─ 找到 mesh_submit 工具
                ├─ 调用 handler(params)
                ├─ 提交任务到网格
                └─ 返回结果
```

**工具定义：**
```typescript
getTools() {
  return [
    {
      name: 'mesh_submit',           // 工具名称
      description: '提交任务到网格',  // 工具描述
      parameters: {                  // 参数定义
        description: {
          type: 'string',
          required: true
        },
        complexity: {
          type: 'string',
          enum: ['simple', 'medium', 'complex'],
          default: 'medium'
        }
      },
      handler: async (params) => {
        // 调用 SEAM 网格
        const task = await this.mesh.submitTask(
          params.description,
          { complexity: params.complexity }
        );
        return { taskId: task.id };
      }
    }
  ];
}
```

#### 方式 3：自动拦截

配置 `interceptMessages: true` 后：

```
用户输入: "帮我研究一下 Rust 异步编程"
                │
                ▼
OpenClaw 路由 ──▶ 所有 Agent
                │
                ▼
MeshSkill.onMessage() 检查
                │
                ├─ 关键词匹配: "研究"
                ├─ 自动拦截消息
                ├─ 提交任务到网格
                └─ 返回结果
```

⚠️ **注意**：自动拦截可能与其他 agent 冲突，建议关闭。

### 1.4 数据流向图

```
┌──────────────────────────────────────────────────────────────┐
│                       用户交互层                              │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ 自然语言    │  │ 命令行      │  │ 程序化调用          │  │
│  │ @mesh ...   │  │ /mesh_*     │  │ tools.mesh_submit() │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼──────────────┘
          │                │                    │
          └────────────────┴────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 消息路由 (Message Router)                               │ │
│  │  ├─ 检查 @mesh/@seam 前缀                              │ │
│  │  ├─ 检查工具命令                                       │ │
│  │  └─ 分发给 MeshSkill                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     SEAM Plugin                              │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ onMessage() │  │ getTools()  │  │ initialize/destroy  │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘  │
└─────────┼────────────────┼───────────────────────────────────┘
          │                │
          └────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                  SelfEvolvingMesh                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 任务队列 (Task Queue)                                   │ │
│  │  ├─ 接收任务                                            │ │
│  │  ├─ 分配给 Agent                                        │ │
│  │  └─ 返回结果                                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Agent 001│ │Agent 002│ │Agent 003│ │  ...    │          │
│  │(研究者) │ │(执行者) │ │(验证者) │ │         │          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └─────────┘          │
│       │           │          │                             │
│       └───────────┴──────────┘                             │
│                   │                                        │
│                   ▼                                        │
│           ┌─────────────┐                                  │
│           │   任务结果   │                                  │
│           └─────────────┘                                  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                       返回给用户                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 二、独立模式交互 (2026.2.x)

当 OpenClaw 不支持插件时，SEAM 作为独立服务运行：

```
┌──────────────────────────────────────────────────────────────┐
│                      独立运行模式                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              SEAM (standalone.js)                        │ │
│  │                                                          │ │
│  │  ┌─────────────┐    HTTP/WebSocket    ┌──────────────┐  │ │
│  │  │  API 服务   │ ◀──────────────────▶ │   OpenClaw   │  │ │
│  │  │  :18789     │                      │   Gateway    │  │ │
│  │  └──────┬──────┘                      └──────────────┘  │ │
│  │         │                                               │ │
│  │         ▼                                               │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │           SelfEvolvingMesh                       │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 通过 HTTP API 交互

```bash
# OpenClaw 通过 HTTP 调用 SEAM

# 提交任务
curl -X POST http://localhost:18789/mesh/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "研究 AI 安全",
    "complexity": "complex"
  }'

# 返回: { "taskId": "task-xxx", "status": "pending" }

# 查询结果
curl http://localhost:18789/mesh/result/task-xxx

# 返回: { "success": true, "output": "..." }

# 查看状态
curl http://localhost:18789/mesh/status

# 返回: { "agentCount": 8, "isRunning": true, ... }
```

### 2.2 OpenClaw 调用 SEAM

OpenClaw 需要配置 HTTP 工具来调用 SEAM：

```yaml
# openclaw.yaml
skills:
  - name: seam-bridge
    http_endpoint: http://localhost:18789
    commands:
      - name: mesh_submit
        endpoint: /mesh/submit
        method: POST
```

---

## 三、任务处理流程详解

### 3.1 完整任务生命周期

```
用户: "@mesh 开发一个用户登录系统"
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. OpenClaw 接收消息                                         │
│    └─ 识别 @mesh 前缀，路由到 MeshSkill                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. MeshSkill.onMessage() 解析                                │
│    └─ 提取命令: "开发一个用户登录系统"                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 提交任务到网格                                            │
│    └─ mesh.submitTask("开发一个用户登录系统", {...})         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Orchestrator 分析任务                                     │
│    ├─ 复杂度评估: complex                                    │
│    ├─ 任务分解:                                              │
│    │   ├─ 需求分析                                           │
│    │   ├─ 技术调研                                           │
│    │   ├─ 后端开发 (API)                                     │
│    │   ├─ 前端开发 (UI)                                      │
│    │   └─ 测试验证                                           │
│    └─ 创建子任务队列                                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. 智能体协作执行                                            │
│    │                                                         │
│    ├─ Researcher 调研登录方案                                │
│    │   └─ JWT vs Session vs OAuth                            │
│    │                                                         │
│    ├─ Executor-1 开发后端 API                                │
│    │   └─ /api/login, /api/register, /api/logout             │
│    │                                                         │
│    ├─ Executor-2 开发前端页面                                │
│    │   └─ Login.vue, Register.vue                            │
│    │                                                         │
│    └─ Validator 测试验证                                     │
│        └─ 安全测试、功能测试                                 │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. 聚合结果                                                  │
│    └─ 整合所有子任务输出                                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. 返回给 OpenClaw                                           │
│    └─ 返回完整结果给 onMessage()                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
用户收到: "✅ 任务完成！已开发完整的用户登录系统...
          包含: 后端 API、前端页面、测试用例"
```

### 3.2 智能体间通信

```
Orchestrator (协调者)
       │
       ├─ 发送任务 ───────────────▶ Researcher (研究者)
       │                              │
       │◀──────── 返回调研报告 ──────┘
       │
       ├─ 发送开发任务 ────────────▶ Executor-1 (执行者)
       │                              │
       │◀──────── 返回代码 ──────────┘
       │
       ├─ 发送验证任务 ────────────▶ Validator (验证者)
       │                              │
       │◀──────── 返回测试报告 ──────┘
       │
       ▼
   整合所有结果
```

---

## 四、配置与 OpenClaw 的关系

### 4.1 配置继承链

```
SEAM 默认配置 (DEFAULT_CONFIG)
    │
    │  genesisAgents: [O:1, R:2, E:3, V:1, E:1]
    │  evolution: { enabled: true, intervalMinutes: 360 }
    │  autoStart: true
    │  interceptMessages: false
    │
    ▼
用户配置 (openclaw.json 中的 seam 或 mesh)
    │
    │  seam:
    │    genesisAgents: [O:1, R:1, E:2]  # 覆盖默认值
    │    evolution: { enabled: false }    # 禁用进化
    │
    ▼
运行时配置 (加载后的 config)
    │
    │  genesisAgents: [O:1, R:1, E:2]    # 使用用户配置
    │  evolution: { enabled: false }     # 使用用户配置
    │  autoStart: true                   # 保持默认值
    │  interceptMessages: false          # 保持默认值
    │
    ▼
SelfEvolvingMesh 实例
```

### 4.2 OpenClaw 与 SEAM 配置对比

| 配置项 | OpenClaw 原生 | SEAM 特有 | 说明 |
|--------|--------------|-----------|------|
| `extensions` | ✅ 2026.3.0+ | ❌ | 加载扩展列表 |
| `seam` / `mesh` | ❌ | ✅ | SEAM 网格配置 |
| `agents` | ✅ | ✅ | OpenClaw agent 配置 |
| `genesisAgents` | ❌ | ✅ | SEAM 初始智能体 |
| `evolution` | ❌ | ✅ | SEAM 进化配置 |
| `skills` | ✅ | ❌ | OpenClaw 技能配置 |

---

## 五、日志与监控

### 5.1 日志流向

```
SEAM 内部日志
    │
    ├─ console.log('[SEAM] ...')    ───▶ OpenClaw 日志系统
    │                                     (gateway.log)
    │
    ├─ 任务执行日志                  ───▶ 任务历史记录
    │                                     (内存/文件)
    │
    └─ 进化历史                      ───▶ 进化历史记录
                                          (mesh.getEvolutionHistory())
```

### 5.2 查看日志

```bash
# 查看 OpenClaw 日志（包含 SEAM 日志）
tail -f ~/.openclaw/logs/gateway.log | grep -i seam

# 查看 SEAM 独立运行日志（如果使用 standalone.js）
tail -f /tmp/openclaw-gateway.log

# 查看 PM2 日志（如果使用 PM2）
pm2 logs seam-mesh
```

---

## 六、总结

### 交互方式对比

| 方式 | 版本要求 | 复杂度 | 适用场景 |
|------|----------|--------|----------|
| **插件模式** | 2026.3.0+ | 低 | 推荐，无缝集成 |
| **独立模式** | 所有版本 | 中 | 向后兼容，灵活部署 |
| **HTTP API** | 所有版本 | 高 | 微服务架构，跨机器 |

### 核心交互点

1. **initialize** - OpenClaw 启动时初始化 SEAM
2. **onMessage** - 处理用户自然语言消息
3. **getTools** - 提供命令行工具
4. **destroy** - OpenClaw 关闭时清理资源
5. **mesh.submitTask** - SEAM 内部任务提交
6. **mesh.getResult** - 获取任务执行结果

### 最佳实践

1. **显式调用**：使用 `@mesh` 或 `@seam` 前缀，避免与其他 agent 冲突
2. **关闭消息拦截**：设置 `interceptMessages: false`
3. **独立模式**：如果 OpenClaw 版本较旧，使用 standalone.js
4. **监控日志**：定期查看日志，确保网格运行正常

---

**参考文档：**
- [PRODUCT.md](PRODUCT.md) - SEAM 产品说明
- [ARCHITECTURE.md](ARCHITECTURE.md) - 架构设计
- [DEPLOY.md](DEPLOY.md) - 部署指南
