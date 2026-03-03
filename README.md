# OpenClaw Self-Evolving Agent Mesh Extension

为 OpenClaw 提供**自我进化的多智能体网格**能力。自动协调多个专门化 AI 智能体协作处理复杂任务，并**智能规划进化策略**，持续自我优化。

## 功能特性

- 🤖 **5 种智能体类型**：协调者、研究者、执行者、验证者、进化者
- 🧬 **遗传进化**：智能体具有可进化的"基因"，通过自然选择淘汰弱者、繁衍优秀后代
- 🧠 **智能进化规划**：自动分析系统瓶颈，制定针对性进化策略，预测进化效果
- 🔄 **自动协作**：复杂任务自动分解，分配给最合适的智能体
- 📊 **负载均衡**：智能体间自动任务分配和故障转移
- 🎯 **自适应**：每 30 秒自动检查系统状态，必要时触发智能进化
- 🔮 **预测能力**：基于历史趋势预测未来需求，提前规划资源配置

## 🚀 快速开始

### 方式一：独立运行（推荐，真实 AI 执行）

SEAM 现在可以作为独立服务运行，直接调用 OpenAI/Anthropic/本地模型 API 执行真实任务：

```bash
# 1. 克隆并构建
git clone https://github.com/zhuzeyu22/openclaw-mesh-extension.git
cd openclaw-mesh-extension
npm install
npm run build

# 2. 配置 AI 提供商（以 OpenAI 为例）
export SEAM_AI_PROVIDER=openai
export OPENAI_API_KEY=sk-your-api-key
export SEAM_AI_MODEL=gpt-4

# 3. 启动服务
npm start

# 或使用启动脚本
./start.sh
```

或使用配置文件：

```bash
# 复制示例配置
cp seam-config.example.json seam-config.json
# 编辑 seam-config.json 填入你的 API Key
npm start
```

服务启动后：
- HTTP API: http://localhost:18789
- 查看状态: `curl http://localhost:18789/health`
- 提交任务: `curl -X POST http://localhost:18789/mesh/submit -d '{"description": "研究 Rust 异步编程"}'`

详细使用说明参见 [USAGE.md](./USAGE.md)

### 方式二：作为 OpenClaw 插件安装

**注意**：需要 OpenClaw 2026.3.0+ 版本支持插件系统。

#### 一键安装（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/zhuzeyu22/openclaw-mesh-extension.git
cd openclaw-mesh-extension

# 2. 运行安装脚本
chmod +x install.sh
./install.sh

# 3. 重启 OpenClaw
openclaw gateway restart

# 4. 验证
openclaw agent --message "网格状态"
```

### 手动安装

```bash
# 1. 构建项目
cd openclaw-mesh-extension
npm install
npm run build

# 2. 复制到 OpenClaw
mkdir -p ~/.openclaw/extensions/openclaw-mesh-extension
cp -r dist/ ~/.openclaw/extensions/openclaw-mesh-extension/
cp package.json ~/.openclaw/extensions/openclaw-mesh-extension/

# 3. 添加配置
cat >> ~/.openclaw/config.yaml << 'EOF'
extensions:
  - path: ./extensions/openclaw-mesh-extension
    enabled: true
seam:
  autoStart: true
EOF

# 4. 重启
openclaw gateway restart
```

### 腾讯云轻量服务器部署

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 上传并运行部署脚本
chmod +x deploy.sh
./deploy.sh

# 查看日志确认运行
tail -f /tmp/openclaw-gateway.log | grep -i mesh
```

详细部署文档参见 [DEPLOY.md](./DEPLOY.md) 和 [USAGE.md](./USAGE.md)

### 独立运行 vs OpenClaw 插件

| 特性 | 独立运行 | OpenClaw 插件 |
|------|----------|---------------|
| **版本要求** | 所有版本 | OpenClaw 2026.3.0+ |
| **真实 AI 执行** | ✅ 支持 | ⚠️ 依赖 OpenClaw 配置 |
| **HTTP API** | ✅ 内置 | 需单独配置 |
| **部署复杂度** | 低 | 中 |
| **与 OpenClaw 集成** | 通过 HTTP | 原生集成 |

### 环境变量配置

```bash
# AI 提供商（必须）
export SEAM_AI_PROVIDER=openai  # 或 anthropic / local
export OPENAI_API_KEY=sk-your-key
export SEAM_AI_MODEL=gpt-4

# 创世智能体配置
export SEAM_AGENTS=O:1,R:2,E:3,V:1

# 服务器配置
export SEAM_PORT=18789
export SEAM_HOST=0.0.0.0
```

更多配置选项参见 [.env.example](./.env.example)

## OpenClaw 插件配置

编辑 `~/.openclaw/config.yaml`：

```yaml
extensions:
  - path: ./extensions/openclaw-mesh-extension
    enabled: true

# 可选：自定义网格配置（使用 'seam' 键，兼容旧版 'mesh'）
seam:
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
    intervalMinutes: 360  # 6小时
    selectionPressure: 0.3  # 淘汰 30%
    mutationRate: 0.2  # 20% 变异率

  autoStart: true
```

重启 OpenClaw Gateway：

```bash
openclaw gateway restart
```

## 使用方法

### 通过 OpenClaw 对话

```
你: 网格状态
Claw: 🧬 **智能体网格状态**
      运行状态: 🟢 运行中
      智能体总数: 8
      队列长度: 0
      当前代: 3
      ...

你: 智能体列表
Claw: 🤖 **智能体列表** (8个)
      - **orchestrator-abc123** (orchestrator)
        代数: 1, 状态: 🟢 空闲, 适应度: 95.0%
      ...

你: 研究最新的 TypeScript 性能优化
Claw: ⏳ **任务已提交** (ID: xyz789)
      任务正在网格中处理...
      [30秒后]
      ✅ **任务完成**
      执行者: researcher-xyz
      结果: [...]

你: 进化计划
Claw: 📋 **进化计划** #k9m2p4

      风险等级: MEDIUM
      预计时长: 8500ms

      检测到的瓶颈:
      - [HIGH] capacity: 任务队列积压 12 个
      - [MEDIUM] efficiency: 响应时间过慢 3200ms

      进化策略:
      1. 扩容执行者
         - 目标: spawn | 预期改进: -40% queueLength
         - 优先级: 10
      2. 优化执行流程
         - 目标: mutate | 预期改进: -25% responseTime
         - 优先级: 7

      预期结果:
      - 响应时间: → 2400ms
      - 容量: → 11 agents

你: 触发进化
Claw: 🧬 **智能进化完成**
      Evolution cycle #4 completed with 2 strategies
      - ✅ 扩容执行者: 成功添加 2 个 executor
      - ✅ 优化执行流程: 已应用变异
```

### 通过工具调用

```yaml
# 在 OpenClaw 的 skill 中调用
- tool: mesh_submit
  parameters:
    description: "分析服务器日志"
    complexity: complex
```

### 程序化使用

```typescript
import { meshPlugin } from 'openclaw-mesh';

// 在自定义 Skill 中使用
const mesh = meshPlugin();
await mesh.initialize(context);

// 提交任务
const result = await mesh.tools.mesh_submit({
  description: '研究 AI 安全',
  complexity: 'complex'
});
```

## 智能进化规划 (Evolution Planner)

系统不再被动等待定时触发，而是**主动分析、智能决策、规划执行**：

### 自动触发机制

每 30 秒检查一次系统状态，当检测到以下情况时自动触发进化：

- 🚨 **队列积压**：任务等待队列超过阈值
- 🚨 **响应延迟**：平均响应时间显著增加
- 🚨 **错误率上升**：任务失败率超过 5%
- 🚨 **资源饱和**：智能体利用率超过 80%
- 🚨 **性能趋势下降**：连续监控显示系统性能恶化

### 智能分析

```
瓶颈识别 → 策略生成 → 效果预测 → 风险评估 → 执行计划
```

**检测到的瓶颈类型：**
- **容量瓶颈 (Capacity)**：处理能力不足，队列积压
- **能力瓶颈 (Capability)**：任务成功率低，需要更强的分析能力
- **效率瓶颈 (Efficiency)**：响应时间过长，需要优化执行流程
- **平衡瓶颈 (Balance)**：智能体类型分布不均衡

### 针对性策略

系统根据识别的瓶颈，自动生成针对性策略：

| 瓶颈 | 策略 | 预期效果 |
|------|------|----------|
| 容量不足 | 扩容执行者 | 队列长度 -40% |
| 能力不够 | 增强研究者 | 成功率 +15% |
| 效率低下 | 优化参数 | 响应时间 -25% |
| 分布不均 | 补充短板 | 负载均衡 +20% |

### 预测与规划

```
你: 预测未来需求
Claw: 🔮 **未来7天需求预测**

      推荐智能体配置:
      - orchestrator: 2个
      - researcher: 4个  (+2)
      - executor: 6个     (+2)
      - validator: 2个    (+1)
      - evolver: 1个

      预测原因:
      - 性能下降趋势，增加执行者应对负载
      - 历史数据显示频繁出现能力瓶颈，增加研究者
```

### 学习与自适应

系统会记录每次进化的结果，学习哪些策略有效：

```
你: 查看进化历史
Claw: 📚 **进化历史** (共12次)

      最近5次:
      1. 计划#x7k9m2 - ✅ 成功
         - 策略数: 3
         - 瓶颈: capacity, efficiency
         - 时间: 2026/3/3 14:32:15
      2. 计划#p4n8q1 - ⚠️ 部分失败
         - 策略数: 4
         - 瓶颈: capability
         - 时间: 2026/3/3 08:15:33
      ...

      经验总结:
      - 扩容策略执行成功率高
      - 参数变异在某些场景下效果不佳
```

## 智能体类型说明

| 类型 | 职责 | 触发场景 |
|------|------|----------|
| **Orchestrator** | 任务分解与协调 | 复杂任务自动调用 |
| **Researcher** | 信息搜集与分析 | 包含"研究/搜索/分析"关键词 |
| **Executor** | 执行具体操作 | 默认执行者 |
| **Validator** | 结果验证 | 包含"验证/检查/测试"关键词 |
| **Evolver** | 控制进化过程 | 手动触发或定时执行 |

## 进化机制

### 智能触发（新）

每 30 秒自动检查系统状态，**智能决定**是否需要进化：

1. **监控**：收集队列长度、响应时间、错误率、资源利用率
2. **分析**：识别瓶颈类型（容量/能力/效率/平衡）
3. **决策**：基于历史学习，判断是否触发进化
4. **规划**：生成针对性的进化策略和预期效果
5. **执行**：按优先级执行策略，实时监控
6. **学习**：记录结果，优化未来决策

### 传统定时进化

仍保留每 6 小时的检查作为保底机制，但仅在必要时执行。

### 适应度评估

- **成功率** (40%)：任务完成比例
- **响应速度** (30%)：平均响应时间
- **协作评分** (30%)：其他智能体的评价

### 可用命令

```
网格状态      - 查看当前网格状态
智能体列表    - 列出所有智能体及其适应度
进化计划      - 查看当前进化计划和检测到的瓶颈
进化历史      - 查看进化历史和学习总结
预测          - 预测未来7天的资源需求
触发进化      - 手动触发智能进化（仅在需要时）
强制进化      - 强制执行进化周期
```

## 腾讯云轻量服务器部署

### 推荐配置

- **CPU/内存**：4核8G 或更高
- **Node.js**：>= 22
- **存储**：50GB SSD

### 部署步骤

```bash
# 1. SSH 登录轻量服务器
ssh root@your-server-ip

# 2. 确保 Node.js 22+ 已安装
node -v  # 应显示 v22.x.x

# 3. 进入 OpenClaw 目录
cd /opt/openclaw  # 或你的安装路径

# 4. 安装扩展
mkdir -p extensions
cd extensions
git clone https://github.com/zhuzeyu22/openclaw-mesh-extension.git
cd openclaw-mesh-extension
npm install
npm run build

# 5. 配置 OpenClaw
cd ~/.openclaw
cat >> config.yaml << 'EOF'
extensions:
  - path: ./extensions/openclaw-mesh-extension
    enabled: true
EOF

# 6. 重启 Gateway
openclaw gateway restart

# 7. 验证
openclaw doctor
```

### 监控日志

```bash
# 查看 OpenClaw 日志
tail -f ~/.openclaw/logs/gateway.log | grep -i mesh

# 查看网格状态
openclaw agent --message "网格状态"
```

## 故障排除

### 扩展未加载

```bash
# 检查配置语法
openclaw config validate

# 查看加载的扩展
openclaw extensions list
```

### 网格未启动

```bash
# 手动启动网格
openclaw agent --message "启动网格"

# 或检查日志
grep -i "mesh\|seam" ~/.openclaw/logs/gateway.log
```

### 编译错误

```bash
cd ~/.openclaw/extensions/openclaw-mesh-extension
rm -rf dist node_modules
npm install
npm run build
```

## 开发

```bash
# 开发模式
npm run dev

# 测试
npm test

# 构建
npm run build

# 类型检查
npm run typecheck
```

## 项目结构

```
src/
├── index.ts              # 入口文件，导出所有公共 API
├── plugin.ts             # OpenClaw 插件实现
├── mesh.ts               # 核心网格控制器
├── evolution-planner.ts  # 智能进化规划器
├── tech-awareness.ts     # 科技趋势感知模块
├── proactive-explorer.ts # 主动探索模块
├── types.ts              # 类型定义
└── utils.ts              # 共享工具函数（新增）
```

## 最近优化（2026-03-03）

### 性能优化
- **事件驱动架构**：将 `getResult()` 从忙等待轮询改为事件驱动，显著降低 CPU 占用
- **内存管理**：添加数据清理机制，防止 `opportunities` 和 `experiments` 数组无限增长

### 代码质量
- **工具函数提取**：创建 `utils.ts` 模块，统一 `generateId`、`sleep` 等常用函数
- **类型安全**：修复多处 `any` 类型，改进类型推断
- **代码复用**：消除重复代码，统一使用共享工具函数

### 架构改进
- **可解析 Promise**：新增 `createResolvablePromise` 工具，用于异步流程控制
- **数组大小限制**：新增 `limitArraySize` 工具，防止内存泄漏

## 许可证

MIT
