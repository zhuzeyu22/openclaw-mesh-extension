# OpenClaw 版本兼容性指南

## 版本支持矩阵

| OpenClaw 版本 | 支持方式 | 配置方式 | 状态 |
|--------------|---------|---------|------|
| 2026.3.0+ | 原生插件 | `extensions` + `seam` | ✅ 完全支持 |
| 2026.2.26 | 需适配器 | 待定 | ⚠️ 需调研 |
| 2026.2.x | 独立模式 | standalone.js | ✅ 支持 |
| 2026.1.x | 独立模式 | standalone.js | ✅ 支持 |

---

## 各版本配置方式

### OpenClaw 2026.3.0+ (推荐)

```json
{
  "extensions": [
    {
      "path": "./extensions/openclaw-mesh-extension",
      "enabled": true
    }
  ],
  "seam": {
    "autoStart": true,
    "genesisAgents": [
      { "type": "orchestrator", "count": 1 },
      { "type": "researcher", "count": 2 },
      { "type": "executor", "count": 3 }
    ]
  }
}
```

### OpenClaw 2026.2.26 (需调研)

**尝试方式 1: agents 配置**
```json
{
  "agents": [
    {
      "name": "seam",
      "path": "./extensions/openclaw-mesh-extension",
      "enabled": true
    }
  ]
}
```

**尝试方式 2: skills 配置**
```json
{
  "skills": [
    {
      "name": "seam",
      "path": "./extensions/openclaw-mesh-extension/dist/index.js",
      "enabled": true
    }
  ]
}
```

**尝试方式 3: 直接加载模块**
```json
{
  "modules": [
    "./extensions/openclaw-mesh-extension"
  ]
}
```

### 所有版本 - 独立模式

```bash
cd ~/.openclaw/extensions/openclaw-mesh-extension
node standalone.js
```

---

## 用户调研脚本

在用户的腾讯云服务器上执行以下命令，帮助确定 2026.2.26 的插件机制：

```bash
#!/bin/bash

echo "=== OpenClaw 版本信息 ==="
openclaw --version

echo ""
echo "=== OpenClaw 安装路径 ==="
which openclaw
npm list -g openclaw

echo ""
echo "=== OpenClaw 目录结构 ==="
OPENCLAW_ROOT=$(npm root -g)/openclaw
ls -la "$OPENCLAW_ROOT" 2>/dev/null || echo "未找到"

echo ""
echo "=== 查找类型定义文件 ==="
find "$OPENCLAW_ROOT" -name "*.d.ts" 2>/dev/null | head -10

echo ""
echo "=== 查找 Skill 接口 ==="
grep -r "interface Skill" "$OPENCLAW_ROOT" 2>/dev/null | head -5
grep -r "export interface Skill" "$OPENCLAW_ROOT" 2>/dev/null | head -5

echo ""
echo "=== 查找配置验证代码 ==="
grep -r "configSchema\|validConfig\|allowedKeys" "$OPENCLAW_ROOT" 2>/dev/null | head -10

echo ""
echo "=== 查找扩展加载代码 ==="
grep -r "extensions\|loadExtension\|loadPlugin" "$OPENCLAW_ROOT/dist" 2>/dev/null | head -10

echo ""
echo "=== 当前配置文件内容 ==="
cat ~/.openclaw/openclaw.json 2>/dev/null || echo "未找到"

echo ""
echo "=== 尝试查看帮助 ==="
openclaw --help 2>&1 | head -30
```

---

## 结论

**当前状态：**
- OpenClaw 2026.2.26 不支持标准的 `extensions` 配置键
- 需要进一步调研其插件/扩展加载机制
- 建议用户使用 **独立运行模式** (standalone.js)

**下一步行动：**
1. 让用户运行调研脚本，提供输出
2. 根据输出确定 2026.2.26 的插件接口
3. 实现对应的适配器
