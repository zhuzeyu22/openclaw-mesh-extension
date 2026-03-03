# SEAM 使用指南

本文档介绍如何运行真实可用的 SEAM 系统。

## 前提条件

1. **Node.js** >= 22.0.0
2. **AI API Key** - OpenAI、Anthropic 或本地模型（如 Ollama）

---

## 快速开始

### 1. 安装依赖

```bash
npm install
npm run build
```

### 2. 配置环境变量

**方式一：使用环境变量（推荐）**

```bash
# Linux/Mac
export SEAM_AI_PROVIDER=openai
export OPENAI_API_KEY=sk-your-api-key
export SEAM_AI_MODEL=gpt-4

# Windows PowerShell
$env:SEAM_AI_PROVIDER="openai"
$env:OPENAI_API_KEY="sk-your-api-key"
$env:SEAM_AI_MODEL="gpt-4"
```

**方式二：使用配置文件**

复制示例配置并修改：

```bash
cp seam-config.example.json seam-config.json
# 编辑 seam-config.json，填入你的 API Key
```

### 3. 启动 SEAM

```bash
npm start
```

成功启动后你会看到：

```
╔════════════════════════════════════════════════════════╗
║  SEAM (Self-Evolving Agent Mesh) - Real Implementation ║
╚════════════════════════════════════════════════════════╝

[SEAM] Starting Self-Evolving Agent Mesh...
[SEAM] AI Provider: openai
[SEAM] Model: gpt-4
[SEAM] Mesh started with 7 agents

📊 SEAM Status
──────────────────────────────────────────────────
🟢 Status: Running
🤖 Total Agents: 7
   - Orchestrators: 1
   - Researchers: 2
   - Executors: 3
   - Validators: 1
   - Evolvers: 1
📋 Queue Length: 0
🧬 Generation: 1
🌐 HTTP Server: http://0.0.0.0:18789
──────────────────────────────────────────────────
```

---

## 使用 HTTP API

SEAM 启动后会监听 HTTP 端口（默认 18789），你可以通过 REST API 与之交互。

### 健康检查

```bash
curl http://localhost:18789/health
```

### 提交任务

```bash
curl -X POST http://localhost:18789/mesh/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "研究 Rust 异步编程的最佳实践",
    "complexity": "medium",
    "submitter": "cli"
  }'
```

返回：
```json
{
  "taskId": "task-abc123",
  "status": "submitted",
  "createdAt": "2026-03-03T10:30:00.000Z"
}
```

### 查询结果

```bash
curl "http://localhost:18789/mesh/result?taskId=task-abc123&timeout=60000"
```

### 查看网格状态

```bash
curl http://localhost:18789/mesh/status
```

### 触发进化

```bash
curl -X POST http://localhost:18789/mesh/evolve
```

---

## 程序化使用

你也可以在自己的代码中使用 SEAM：

```typescript
import { SelfEvolvingMesh, TaskExecutor } from 'openclaw-mesh';

// 1. 创建网格
const mesh = new SelfEvolvingMesh({
  genesisAgents: [
    { type: 'orchestrator', count: 1 },
    { type: 'researcher', count: 2 },
    { type: 'executor', count: 3 },
    { type: 'validator', count: 1 },
  ],
  evolution: {
    enabled: true,
    intervalMinutes: 360,
    selectionPressure: 0.7,
    mutationRate: 0.1,
  }
});

// 2. 配置 AI 执行器（必须）
mesh.setExecutor({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  timeoutMs: 60000,
});

// 3. 启动网格
await mesh.start();

// 4. 提交任务
const task = await mesh.submitTask(
  "研究 TypeScript 性能优化方案",
  { complexity: 'medium', submitter: 'user' }
);

console.log(`Task submitted: ${task.id}`);

// 5. 等待结果
const result = await mesh.getResult(task.id, 120000);
console.log(`Result: ${result.output}`);

// 6. 关闭
await mesh.stop();
```

---

## 配置选项

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SEAM_AI_PROVIDER` | AI 提供商: `openai`, `anthropic`, `local` | 无（必须设置） |
| `OPENAI_API_KEY` | OpenAI API Key | 无 |
| `ANTHROPIC_API_KEY` | Anthropic API Key | 无 |
| `SEAM_AI_BASE_URL` | 自定义 API 基础 URL（本地模型用） | 无 |
| `SEAM_AI_MODEL` | 模型名称 | 提供商默认 |
| `SEAM_AI_TIMEOUT` | AI 调用超时（毫秒） | 60000 |
| `SEAM_AGENTS` | 创世智能体配置 | `O:1,R:1,E:2,V:1` |
| `SEAM_EVOLUTION_ENABLED` | 是否启用进化 | `true` |
| `SEAM_EVOLUTION_INTERVAL` | 进化间隔（分钟） | 360 |
| `SEAM_PORT` | HTTP 服务器端口 | 18789 |
| `SEAM_HOST` | HTTP 服务器地址 | `0.0.0.0` |
| `SEAM_API_KEY` | HTTP API 鉴权密钥 | 无 |

### 智能体类型简写

在 `SEAM_AGENTS` 中使用：

| 简写 | 类型 | 职责 |
|------|------|------|
| `O` | orchestrator | 任务协调、分解 |
| `R` | researcher | 技术研究、调研 |
| `E` | executor | 代码执行、实现 |
| `V` | validator | 验证、测试 |
| `EV` | evolver | 系统进化、优化 |

---

## AI 提供商配置示例

### OpenAI

```bash
export SEAM_AI_PROVIDER=openai
export OPENAI_API_KEY=sk-...
export SEAM_AI_MODEL=gpt-4  # 或 gpt-3.5-turbo
```

### Anthropic Claude

```bash
export SEAM_AI_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-ant-...
export SEAM_AI_MODEL=claude-3-sonnet-20240229
```

### 本地模型 (Ollama)

```bash
# 1. 先安装并启动 Ollama
# https://ollama.com

# 2. 拉取模型
ollama pull llama2

# 3. 配置 SEAM
export SEAM_AI_PROVIDER=local
export SEAM_AI_BASE_URL=http://localhost:11434
export SEAM_AI_MODEL=llama2
```

---

## 部署到腾讯云

### 1. 上传代码

```bash
# 打包项目
tar czvf seam.tar.gz --exclude='node_modules' --exclude='dist' .

# 上传到服务器
scp seam.tar.gz root@your-tencent-cloud-ip:/opt/

# 解压
ssh root@your-tencent-cloud-ip "cd /opt && tar xzvf seam.tar.gz && cd openclaw-mesh-extension && npm install && npm run build"
```

### 2. 配置 systemd 服务

创建 `/etc/systemd/system/seam.service`：

```ini
[Unit]
Description=SEAM Self-Evolving Agent Mesh
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/openclaw-mesh-extension
Environment="SEAM_AI_PROVIDER=openai"
Environment="OPENAI_API_KEY=sk-your-key"
Environment="SEAM_PORT=18789"
Environment="SEAM_HOST=0.0.0.0"
ExecStart=/usr/bin/node dist/standalone.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. 启动服务

```bash
systemctl daemon-reload
systemctl enable seam
systemctl start seam
systemctl status seam
```

### 4. 配置 Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name seam.your-domain.com;

    location / {
        proxy_pass http://localhost:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 故障排查

### 错误：No AI executor configured

**原因**：没有设置 AI 提供商
**解决**：
```bash
export SEAM_AI_PROVIDER=openai
export OPENAI_API_KEY=sk-your-key
```

### 错误：OpenAI API error: 401

**原因**：API Key 无效
**解决**：检查 API Key 是否正确

### 错误：ECONNREFUSED localhost:11434

**原因**：本地模型（Ollama）未启动
**解决**：启动 Ollama 服务

### 查看日志

```bash
# 独立运行
npm start 2>&1 | tee seam.log

# systemd
journalctl -u seam -f
```

---

## 相关文档

- [PRODUCT.md](PRODUCT.md) - 产品说明
- [ARCHITECTURE.md](ARCHITECTURE.md) - 架构设计
- [INTERACTION.md](INTERACTION.md) - 与 OpenClaw 交互机制
