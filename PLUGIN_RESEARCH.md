# OpenClaw 插件系统调研报告

## 版本兼容性分析

### OpenClaw 2026.2.26 (当前用户版本)
- ❌ 不支持 `extensions` 配置键
- ❌ 不支持 `seam`/`mesh` 自定义配置键
- ❌ 不支持通过 `context.config.get()` 读取自定义配置

### OpenClaw 2026.3.0+ (插件支持版本)
- ✅ 支持 `extensions` 配置键
- ✅ 支持插件通过 `context.config.get()` 读取配置
- ✅ 支持 `Skill` 接口的插件系统

---

## 可能的解决方案

### 方案 1：传统的 OpenClaw Skill 方式 (2026.2.26 兼容)

2026.2.26 版本可能支持传统的 Skill 注册方式，通过导出一个对象而不是使用 `extensions` 配置。

```javascript
// index.js - 作为 OpenClaw 直接加载的模块
const { SelfEvolvingMesh } = require('./dist/mesh.js');

// OpenClaw 2026.2.26 可能通过查找特定的导出
module.exports = {
  // 传统 Skill 接口
  name: 'seam',
  description: '自我进化智能体网格',
  version: '1.0.0',

  async initialize(context) {
    // 2026.2.26 可能没有 context.config.get
    // 需要从环境变量或默认配置读取
    const mesh = new SelfEvolvingMesh({
      genesisAgents: [
        { type: 'orchestrator', count: 1 },
        { type: 'researcher', count: 2 },
        { type: 'executor', count: 3 },
      ],
      evolution: { enabled: true, intervalMinutes: 360 },
      autoStart: true,
    });
    await mesh.start();
    this.mesh = mesh;
  },

  async onMessage(message) {
    if (message.includes('网格状态')) {
      return JSON.stringify(this.mesh.getStatus());
    }
    return null;
  },
};
```

### 方案 2：使用 OpenClaw 内置的 Agent 扩展机制

2026.2.26 可能支持通过 `agents` 配置项加载自定义 agent：

```json
{
  "agents": [
    {
      "name": "seam-mesh",
      "path": "./extensions/openclaw-mesh-extension/dist/plugin.js",
      "enabled": true
    }
  ]
}
```

### 方案 3：Monkey Patch / 运行时注入

在 OpenClaw 启动时动态注入 mesh 功能：

```javascript
// 在 openclaw.json 中添加启动脚本
{
  "startupScript": "./extensions/openclaw-mesh-extension/inject.js"
}
```

### 方案 4：独立服务模式 (推荐)

完全绕过 OpenClaw 的插件系统，作为独立服务运行，通过 HTTP/WebSocket 与 OpenClaw 通信。

---

## 调研任务

需要确认以下几点：

1. **2026.2.26 的 Skill 接口定义**
   - 查找 `node_modules/openclaw` 中的类型定义
   - 查看 `Skill` 接口的具体要求
   - 确认 `initialize` 函数的参数

2. **2026.2.26 的配置格式**
   - 哪些配置键是合法的？
   - 如何加载外部模块？
   - 是否有 `agents` 或 `skills` 配置项？

3. **模块加载机制**
   - OpenClaw 如何发现和加载扩展？
   - 是否支持 `node_modules` 中的模块？
   - 是否支持指定路径的模块？

---

## 建议的验证步骤

在用户的腾讯云服务器上执行：

```bash
# 1. 确认 OpenClaw 版本
openclaw --version

# 2. 查找 OpenClaw 安装目录
which openclaw
npm list -g openclaw

# 3. 查看 OpenClaw 类型定义
cat $(npm root -g)/openclaw/dist/plugin-sdk.d.ts 2>/dev/null || \
cat $(npm root -g)/openclaw/lib/plugin-sdk.d.ts 2>/dev/null || \
find $(npm root -g)/openclaw -name "*.d.ts" | head -5

# 4. 查看 OpenClaw 源码中的 Skill 接口
grep -r "interface Skill" $(npm root -g)/openclaw 2>/dev/null | head -5

# 5. 查看合法的配置键
grep -r "configSchema" $(npm root -g)/openclaw 2>/dev/null | head -5
```

---

## 参考资料

- OpenClaw 2026.2.26 发布说明
- OpenClaw 插件开发文档
- OpenClaw 配置文档

---

## 结论

基于当前信息，**OpenClaw 2026.2.26 很可能不支持外部插件扩展系统**。建议的解决方案优先级：

1. **升级 OpenClaw 到 2026.3.0+** (推荐，如果可能)
2. **使用独立服务模式** (standalone.js)
3. **调研 2026.2.26 的传统 Skill 接口** (需要更多信息)
4. **Fork OpenClaw 并修改源码** (最后手段)
