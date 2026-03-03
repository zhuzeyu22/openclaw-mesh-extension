#!/bin/bash
# SEAM 启动脚本

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}SEAM (Self-Evolving Agent Mesh) 启动脚本${NC}"
echo "=========================================="

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: Node.js 未安装${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${YELLOW}警告: Node.js 版本需要 >= 22.0.0${NC}"
    echo "当前版本: $(node -v)"
fi

# 检查是否已构建
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}首次运行，正在构建...${NC}"
    npm install
    npm run build
fi

# 检查配置
if [ -z "$SEAM_AI_PROVIDER" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}警告: 未配置 AI 提供商${NC}"
    echo ""
    echo "请设置以下环境变量之一:"
    echo "  export SEAM_AI_PROVIDER=openai"
    echo "  export OPENAI_API_KEY=sk-your-key"
    echo ""
    echo "或使用配置文件:"
    echo "  cp seam-config.example.json seam-config.json"
    echo "  # 编辑 seam-config.json 填入 API Key"
    echo ""
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 启动 SEAM
echo -e "${GREEN}启动 SEAM...${NC}"
node dist/standalone.js
