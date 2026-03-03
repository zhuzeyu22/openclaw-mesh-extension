#!/bin/bash
# OpenClaw Mesh Extension 一键安装脚本
# Usage: ./install.sh [openclaw-path]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧬 OpenClaw Mesh Extension Installer${NC}"
echo "======================================"

# 获取 OpenClaw 路径
OPENCLAW_PATH="${1:-$HOME/.openclaw}"
if [ ! -d "$OPENCLAW_PATH" ]; then
    echo -e "${RED}❌ OpenClaw 目录不存在: $OPENCLAW_PATH${NC}"
    echo "请提供正确的路径，或使用默认路径:"
    echo "  ./install.sh /path/to/openclaw"
    exit 1
fi

echo "OpenClaw 路径: $OPENCLAW_PATH"

# 检查 Node.js
echo ""
echo "📋 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}❌ Node.js 版本过低，需要 >= 22${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"

# 检查当前目录
echo ""
echo "📋 检查项目文件..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 请在 openclaw-mesh-extension 目录中运行此脚本${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 项目文件检查通过${NC}"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install --silent
echo -e "${GREEN}✅ 依赖安装完成${NC}"

# 构建项目
echo ""
echo "🔨 构建项目..."
npm run build
echo -e "${GREEN}✅ 构建完成${NC}"

# 安装到 OpenClaw
echo ""
echo "📁 安装扩展到 OpenClaw..."
EXTENSION_DIR="$OPENCLAW_PATH/extensions/openclaw-mesh"
mkdir -p "$EXTENSION_DIR"

# 清理旧文件
rm -rf "$EXTENSION_DIR"/*

# 复制新文件
cp -r dist/ "$EXTENSION_DIR/"
cp package.json "$EXTENSION_DIR/"
cp README.md "$EXTENSION_DIR/" 2>/dev/null || true

echo -e "${GREEN}✅ 扩展已安装到: $EXTENSION_DIR${NC}"

# 配置 OpenClaw
echo ""
echo "⚙️  配置 OpenClaw..."
CONFIG_FILE="$OPENCLAW_PATH/config.yaml"

if [ -f "$CONFIG_FILE" ]; then
    # 备份配置
    cp "$CONFIG_FILE" "$CONFIG_FILE.bak.$(date +%Y%m%d%H%M%S)"

    # 检查是否已有配置
    if ! grep -q "openclaw-mesh" "$CONFIG_FILE"; then
        cat >> "$CONFIG_FILE" << 'EOF'

# Self-Evolving Agent Mesh Extension
extensions:
  - path: ./extensions/openclaw-mesh
    enabled: true

mesh:
  autoStart: true
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
        echo -e "${GREEN}✅ 配置已添加${NC}"
    else
        echo -e "${YELLOW}⚠️  配置中已存在 mesh 配置，保留现有配置${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未找到 config.yaml，请手动添加配置${NC}"
    echo "配置示例:"
    cat << 'EOF'
extensions:
  - path: ./extensions/openclaw-mesh
    enabled: true
EOF
fi

# 完成
echo ""
echo "======================================"
echo -e "${GREEN}🎉 安装完成！${NC}"
echo ""
echo "下一步:"
echo "  1. 重启 OpenClaw Gateway:"
echo "     openclaw gateway restart"
echo ""
echo "  2. 验证安装:"
echo "     openclaw agent --message '网格状态'"
echo ""
echo "  3. 查看文档:"
echo "     cat DEPLOY.md"
echo ""
