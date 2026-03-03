# OpenClaw Mesh Extension 部署指南

## 快速部署（推荐）

### 方法 1：使用部署脚本（自动）

```bash
# 1. 进入项目目录
cd openclaw-mesh-extension

# 2. 安装依赖并构建
npm install
npm run build

# 3. 运行部署脚本（自动复制到 OpenClaw 扩展目录）
chmod +x deploy.sh
./deploy.sh
```

### 方法 2：手动部署

#### 步骤 1：构建项目

```bash
# 进入项目目录
cd openclaw-mesh-extension

# 安装依赖
npm install

# 类型检查（确保无类型错误）
npm run typecheck

# 编译 TypeScript
npm run build

# 验证构建成功（应该生成 dist/ 目录）
ls dist/
# 应该看到: index.js, plugin.js, mesh.js, evolution-planner.js, types.js, utils.js 等
```

#### 步骤 2：复制到 OpenClaw

```bash
# 确定 OpenClaw 扩展目录
# 通常是 ~/.openclaw/extensions/ 或 /opt/openclaw/extensions/

# 创建扩展目录
mkdir -p ~/.openclaw/extensions/openclaw-mesh

# 复制构建后的文件
cp -r dist/ ~/.openclaw/extensions/openclaw-mesh/
cp package.json ~/.openclaw/extensions/openclaw-mesh/
cp README.md ~/.openclaw/extensions/openclaw-mesh/

# 验证复制成功
ls -la ~/.openclaw/extensions/openclaw-mesh/
```

#### 步骤 3：配置 OpenClaw

编辑 OpenClaw 配置文件：

```bash
# 找到配置文件位置
openclaw config path
# 通常是 ~/.openclaw/config.yaml

# 编辑配置
nano ~/.openclaw/config.yaml
```

添加扩展配置：

```yaml
# 在文件末尾添加
extensions:
  - path: ./extensions/openclaw-mesh
    enabled: true

# SEAM 网格配置（推荐使用 'seam' 键，兼容旧版 'mesh'）
seam:
  autoStart: true

  # 是否拦截自然语言消息
  # - false: 只响应显式调用（@mesh/@seam），避免与其他 agent 冲突（推荐）
  # - true: 自动拦截包含特定关键词的消息（可能与其他 agent 冲突）
  interceptMessages: false

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
    intervalMinutes: 360  # 6小时保底检查
    selectionPressure: 0.3
    mutationRate: 0.2

  # 科技感知配置
  techAwareness:
    enabled: true
    scanIntervalMinutes: 60

  # 主动探索配置
  proactiveExplorer:
    enabled: true
    explorationIntervalMinutes: 20
```

#### 步骤 4：重启 OpenClaw Gateway

```bash
# 方法 1：使用 OpenClaw CLI
openclaw gateway restart

# 方法 2：手动重启
pkill -f openclaw-gateway
openclaw gateway --port 18789 --verbose &

# 方法 3：如果使用 systemd
sudo systemctl restart openclaw
```

#### 步骤 5：验证部署

```bash
# 检查扩展是否加载
openclaw extensions list

# 应该看到: openclaw-mesh (enabled)

# 测试网格功能
openclaw agent --message "网格状态"
```

---

## 腾讯云轻量服务器部署（生产环境）

### 环境要求

- **操作系统**: Ubuntu 22.04 LTS / CentOS 8 / Debian 12
- **Node.js**: >= 22.x
- **内存**: >= 4GB 推荐
- **存储**: >= 20GB SSD

### 完整部署流程

```bash
#!/bin/bash
# deploy-to-tencent.sh

set -e

echo "🚀 OpenClaw Mesh Extension - Tencent Cloud Deploy"
echo "=================================================="

# 1. 检查环境
echo ""
echo "📋 Step 1: 检查环境"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js 版本过低，需要 >= 22"
    exit 1
fi
echo "✅ Node.js: $(node -v)"

# 2. 检查 OpenClaw
echo ""
echo "📋 Step 2: 检查 OpenClaw"
if ! command -v openclaw &> /dev/null; then
    echo "⚠️  OpenClaw CLI 未安装"
    echo "请先安装 OpenClaw: npm install -g openclaw"
    exit 1
fi
echo "✅ OpenClaw: $(openclaw --version)"

# 3. 获取 OpenClaw 路径
echo ""
echo "📋 Step 3: 确定安装路径"
OPENCLAW_PATH=$(openclaw config get paths.data 2>/dev/null || echo "$HOME/.openclaw")
echo "OpenClaw 路径: $OPENCLAW_PATH"

# 4. 构建项目
echo ""
echo "📋 Step 4: 构建 Mesh Extension"
cd /path/to/openclaw-mesh-extension  # 修改为你的实际路径
npm install
npm run build

# 5. 安装扩展
echo ""
echo "📋 Step 5: 安装扩展到 OpenClaw"
EXTENSION_DIR="$OPENCLAW_PATH/extensions/openclaw-mesh"
mkdir -p "$EXTENSION_DIR"
rm -rf "$EXTENSION_DIR"/*
cp -r dist/* "$EXTENSION_DIR/"
cp package.json "$EXTENSION_DIR/"
echo "✅ 扩展已安装到: $EXTENSION_DIR"

# 6. 配置 OpenClaw
echo ""
echo "📋 Step 6: 配置 OpenClaw"
CONFIG_FILE="$OPENCLAW_PATH/config.yaml"

if [ -f "$CONFIG_FILE" ]; then
    # 备份原配置
    cp "$CONFIG_FILE" "$CONFIG_FILE.bak.$(date +%Y%m%d%H%M%S)"

    # 检查是否已有 mesh 配置
    if ! grep -q "openclaw-mesh" "$CONFIG_FILE"; then
        cat >> "$CONFIG_FILE" << 'EOF'

# Self-Evolving Agent Mesh (SEAM) Extension
extensions:
  - path: ./extensions/openclaw-mesh
    enabled: true

seam:
  autoStart: true
  # 默认不拦截消息，避免与其他 agent 冲突
  # 使用 @mesh/@seam 显式调用
  interceptMessages: false
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
    intervalMinutes: 360
    selectionPressure: 0.3
    mutationRate: 0.2
EOF
        echo "✅ 配置已更新"
    else
        echo "⚠️  配置中已存在 mesh 配置，跳过"
    fi
else
    echo "⚠️  未找到 config.yaml，请手动添加配置"
fi

# 7. 重启服务
echo ""
echo "📋 Step 7: 重启 OpenClaw Gateway"
if pgrep -f "openclaw-gateway" > /dev/null; then
    pkill -f "openclaw-gateway"
    sleep 2
fi

nohup openclaw gateway --port 18789 > /tmp/openclaw-gateway.log 2>&1 &
echo "✅ Gateway 已重启"

# 8. 验证
echo ""
echo "📋 Step 8: 验证部署"
sleep 3
if openclaw channels status --probe 2>/dev/null | grep -q "running"; then
    echo "✅ Gateway 运行正常"
else
    echo "⚠️  Gateway 状态未知，请检查日志"
fi

echo ""
echo "=================================================="
echo "🎉 部署完成！"
echo ""
echo "测试命令:"
echo "  openclaw agent --message '网格状态'"
echo "  openclaw agent --message '智能体列表'"
echo "  openclaw agent --message '进化计划'"
echo ""
echo "查看日志:"
echo "  tail -f /tmp/openclaw-gateway.log"
echo ""
```

---

## 更新部署

当你修改了代码，需要更新部署：

```bash
# 1. 重新构建
cd openclaw-mesh-extension
npm run build

# 2. 复制新文件
OPENCLAW_PATH=${OPENCLAW_PATH:-$HOME/.openclaw}
rm -rf "$OPENCLAW_PATH/extensions/openclaw-mesh/dist"
cp -r dist/ "$OPENCLAW_PATH/extensions/openclaw-mesh/"

# 3. 重启 Gateway
openclaw gateway restart

# 4. 验证
openclaw agent --message "网格状态"
```

---

## 故障排除

### 问题 1：扩展未加载

```bash
# 检查 OpenClaw 日志
tail -n 50 ~/.openclaw/logs/gateway.log | grep -i mesh

# 常见原因：
# 1. 路径错误 - 确保路径相对于 config.yaml
# 2. 缺少 dist 目录 - 重新运行 npm run build
# 3. 语法错误 - 检查 config.yaml 格式
```

### 问题 2：网格无法启动

```bash
# 检查是否有错误信息
openclaw agent --message "网格状态"

# 手动查看详细日志
grep -i "seam\|mesh\|evolution" ~/.openclaw/logs/gateway.log
```

### 问题 3：TypeScript 编译错误

```bash
# 清除缓存重新构建
rm -rf dist/ node_modules/
npm install
npm run build
```

### 问题 4：权限问题

```bash
# 确保 OpenClaw 有权限读取扩展
chmod -R 755 ~/.openclaw/extensions/openclaw-mesh
```

---

## 卸载

```bash
# 1. 从配置中移除
nano ~/.openclaw/config.yaml
# 删除 extensions 和 mesh 相关配置

# 2. 删除扩展文件
rm -rf ~/.openclaw/extensions/openclaw-mesh

# 3. 重启 Gateway
openclaw gateway restart
```

---

## 文件结构（部署后）

```
~/.openclaw/
├── config.yaml                    # OpenClaw 配置
├── extensions/
│   └── openclaw-mesh/
│       ├── package.json
│       └── dist/
│           ├── index.js           # 入口文件
│           ├── plugin.js          # 插件实现
│           ├── mesh.js            # 网格核心
│           ├── evolution-planner.js
│           ├── tech-awareness.js
│           ├── proactive-explorer.js
│           ├── types.js
│           ├── utils.js           # 共享工具函数
│           └── *.d.ts
├── logs/
│   └── gateway.log               # 查看 Mesh 日志
└── ...
```

---

## 验证清单

部署完成后，运行以下命令验证：

```bash
# ✅ 检查 1：扩展已加载（技能名已改为 seam）
openclaw extensions list | grep seam

# ✅ 检查 2：网格已启动（使用显式调用前缀）
openclaw agent --message "@mesh 网格状态"
# 或: openclaw agent --message "@seam 网格状态"
# 应该显示: 运行状态: 🟢 运行中

# ✅ 检查 3：智能体已创建
openclaw agent --message "@mesh 智能体列表"
# 应该显示: 8个智能体 (ID 以 seam- 开头)

# ✅ 检查 4：进化计划功能
openclaw agent --message "@mesh 进化计划"
# 应该显示: 当前系统状态或进化计划

# ✅ 检查 5：查看帮助
openclaw agent --message "@mesh help"
# 应该显示: SEAM 使用帮助

# ✅ 检查 6：任务提交（显式调用，避免与其他 agent 冲突）
openclaw agent --message "@mesh 研究 AI 安全"
# 应该显示: 任务已提交
```

**注意**：默认配置下需要使用 `@mesh` 或 `@seam` 前缀显式调用。
如需自动拦截消息，请在配置中设置 `interceptMessages: true`（可能与其他 agent 冲突）。

全部通过即表示部署成功！
