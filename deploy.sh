#!/bin/bash
# OpenClaw Self-Evolving Agent Mesh 部署脚本
# 用于腾讯云轻量服务器

set -e

echo "🧬 OpenClaw Mesh Extension Deploy Script"
echo "=========================================="

# 检查 Node.js 版本
echo ""
echo "📋 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js 版本过低，需要 >= 22，当前: $(node -v)"
    exit 1
fi
echo "✅ Node.js 版本: $(node -v)"

# 检查 OpenClaw
echo ""
echo "📋 检查 OpenClaw..."
if ! command -v openclaw &> /dev/null; then
    echo "⚠️  OpenClaw CLI 未找到，将尝试使用本地路径"
    OPENCLAW_PATH="${OPENCLAW_PATH:-$HOME/.openclaw}"
else
    OPENCLAW_PATH=$(openclaw config get paths.data 2>/dev/null || echo "$HOME/.openclaw")
fi
echo "✅ OpenClaw 路径: $OPENCLAW_PATH"

# 创建扩展目录
EXTENSION_DIR="$OPENCLAW_PATH/extensions/openclaw-mesh"
echo ""
echo "📁 创建扩展目录: $EXTENSION_DIR"
mkdir -p "$EXTENSION_DIR"

# 复制文件
echo "📦 复制文件..."
cp -r src package.json tsconfig.json README.md "$EXTENSION_DIR/" 2>/dev/null || {
    echo "⚠️  复制失败，尝试使用当前目录..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cp -r "$SCRIPT_DIR"/src "$SCRIPT_DIR"/package.json "$SCRIPT_DIR"/tsconfig.json "$SCRIPT_DIR"/README.md "$EXTENSION_DIR/"
}

# 安装依赖
echo ""
echo "📦 安装依赖..."
cd "$EXTENSION_DIR"
if command -v pnpm &> /dev/null; then
    pnpm install
elif command -v npm &> /dev/null; then
    npm install
else
    echo "❌ 未找到包管理器 (pnpm/npm)"
    exit 1
fi

# 编译
echo ""
echo "🔨 编译 TypeScript..."
npm run build

# 配置 OpenClaw
echo ""
echo "⚙️  配置 OpenClaw..."
CONFIG_FILE="$OPENCLAW_PATH/config.yaml"

if [ -f "$CONFIG_FILE" ]; then
    # 检查是否已有 seam 配置
    if ! grep -q "seam:" "$CONFIG_FILE"; then
        echo "" >> "$CONFIG_FILE"
        echo "# Self-Evolving Agent Mesh (SEAM) Extension" >> "$CONFIG_FILE"
        echo "extensions:" >> "$CONFIG_FILE"
        echo "  - path: ./extensions/openclaw-mesh" >> "$CONFIG_FILE"
        echo "    enabled: true" >> "$CONFIG_FILE"
        echo "" >> "$CONFIG_FILE"
        echo "# SEAM 网格配置" >> "$CONFIG_FILE"
        echo "seam:" >> "$CONFIG_FILE"
        echo "  autoStart: true" >> "$CONFIG_FILE"
        echo "  # 是否拦截自然语言消息（默认false，避免与其他agent冲突）" >> "$CONFIG_FILE"
        echo "  # 设为true会自动拦截包含'研究/分析/开发/复杂'的消息" >> "$CONFIG_FILE"
        echo "  interceptMessages: false" >> "$CONFIG_FILE"
        echo "  evolution:" >> "$CONFIG_FILE"
        echo "    enabled: true" >> "$CONFIG_FILE"
        echo "    intervalMinutes: 360" >> "$CONFIG_FILE"
    fi
else
    echo "⚠️  未找到 config.yaml，请手动添加扩展配置"
fi

echo ""
echo "✅ 部署完成!"
echo ""
echo "📝 使用说明:"
echo "   1. 重启 OpenClaw Gateway:"
echo "      openclaw gateway restart"
echo ""
echo "   2. 验证安装:"
echo "      openclaw agent --message \"网格状态\""
echo ""
echo "   3. 查看智能体列表:"
echo "      openclaw agent --message \"智能体列表\""
echo ""
echo "📚 更多信息请查看 README.md"
