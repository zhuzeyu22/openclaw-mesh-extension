/**
 * SEAM 独立运行入口
 * 真实可用的实现 - 需要配置 AI 提供商
 */

import { SelfEvolvingMesh } from './mesh.js';
import { SeamServer } from './server.js';
import type { ExecutorConfig } from './executor.js';
import type { MeshConfig, AgentType, GenesisConfig } from './types.js';

// ==================== 配置加载 ====================

interface SeamConfig {
  mesh: MeshConfig;
  executor?: ExecutorConfig;
  server?: {
    port?: number;
    host?: string;
    apiKey?: string;
  };
}

/**
 * 从环境变量加载配置
 */
function loadConfigFromEnv(): SeamConfig {
  const genesisAgents: GenesisConfig[] = [];

  // 解析创世智能体配置
  const agentConfig = process.env.SEAM_AGENTS || 'O:1,R:1,E:2,V:1';
  const agentMap: Record<string, AgentType> = {
    'O': 'orchestrator',
    'R': 'researcher',
    'E': 'executor',
    'V': 'validator',
    'EV': 'evolver'
  };

  for (const part of agentConfig.split(',')) {
    const [type, count] = part.trim().split(':');
    const agentType = agentMap[type.toUpperCase()];
    if (agentType) {
      genesisAgents.push({ type: agentType, count: parseInt(count, 10) || 1 });
    }
  }

  // 确保至少有一些智能体
  if (genesisAgents.length === 0) {
    genesisAgents.push(
      { type: 'orchestrator', count: 1 },
      { type: 'researcher', count: 1 },
      { type: 'executor', count: 2 },
      { type: 'validator', count: 1 }
    );
  }

  // 加载执行器配置
  let executor: ExecutorConfig | undefined;
  const provider = process.env.SEAM_AI_PROVIDER as 'openai' | 'anthropic' | 'local' | undefined;

  if (provider) {
    executor = {
      provider,
      apiKey: process.env.SEAM_AI_API_KEY,
      baseUrl: process.env.SEAM_AI_BASE_URL,
      model: process.env.SEAM_AI_MODEL,
      timeoutMs: parseInt(process.env.SEAM_AI_TIMEOUT || '60000', 10),
    };
  }

  return {
    mesh: {
      genesisAgents,
      evolution: {
        enabled: process.env.SEAM_EVOLUTION_ENABLED !== 'false',
        intervalMinutes: parseInt(process.env.SEAM_EVOLUTION_INTERVAL || '360', 10),
        selectionPressure: 0.7,
        mutationRate: 0.1,
      },
      autoStart: true,
      interceptMessages: false,
    },
    executor,
    server: {
      port: parseInt(process.env.SEAM_PORT || '18789', 10),
      host: process.env.SEAM_HOST || '0.0.0.0',
      apiKey: process.env.SEAM_API_KEY,
    },
  };
}

/**
 * 从配置文件加载
 */
async function loadConfigFromFile(filepath: string): Promise<SeamConfig | null> {
  try {
    const fs = await import('fs');
    const content = fs.readFileSync(filepath, 'utf-8');
    const config = JSON.parse(content);
    console.log(`[SEAM] Loaded config from ${filepath}`);
    return config;
  } catch {
    return null;
  }
}

// ==================== 主程序 ====================

class SeamApplication {
  private mesh?: SelfEvolvingMesh;
  private server?: SeamServer;
  private config: SeamConfig;

  constructor(config: SeamConfig) {
    this.config = config;
  }

  /**
   * 启动应用
   */
  async start(): Promise<void> {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  SEAM (Self-Evolving Agent Mesh) - Real Implementation ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // 1. 创建网格
    this.mesh = new SelfEvolvingMesh(this.config.mesh);

    // 2. 配置执行器（真实 AI 调用）
    if (this.config.executor) {
      this.mesh.setExecutor(this.config.executor);
      console.log(`[SEAM] AI Provider: ${this.config.executor.provider}`);
      console.log(`[SEAM] Model: ${this.config.executor.model || 'default'}`);
    } else {
      console.error('\n❌ ERROR: No AI executor configured!');
      console.error('Please set one of the following environment variables:');
      console.error('  - SEAM_AI_PROVIDER=openai + OPENAI_API_KEY');
      console.error('  - SEAM_AI_PROVIDER=anthropic + ANTHROPIC_API_KEY');
      console.error('  - SEAM_AI_PROVIDER=local + SEAM_AI_BASE_URL\n');
      process.exit(1);
    }

    // 3. 启动网格
    await this.mesh.start();

    // 4. 启动 HTTP 服务器
    if (this.config.server) {
      this.server = new SeamServer(this.mesh, this.config.server);
      await this.server.start();
    }

    // 5. 打印状态
    this.printStatus();

    // 6. 设置信号处理
    this.setupSignalHandlers();
  }

  /**
   * 停止应用
   */
  async stop(): Promise<void> {
    console.log('\n[SEAM] Shutting down...');
    await this.server?.stop();
    await this.mesh?.stop();
    console.log('[SEAM] Goodbye!');
    process.exit(0);
  }

  /**
   * 打印状态
   */
  private printStatus(): void {
    if (!this.mesh) return;

    const status = this.mesh.getStatus();

    console.log('\n📊 SEAM Status');
    console.log('─'.repeat(50));
    console.log(`🟢 Status: ${status.isRunning ? 'Running' : 'Stopped'}`);
    console.log(`🤖 Total Agents: ${status.agentCount}`);
    console.log(`   - Orchestrators: ${status.agentsByType.orchestrator}`);
    console.log(`   - Researchers: ${status.agentsByType.researcher}`);
    console.log(`   - Executors: ${status.agentsByType.executor}`);
    console.log(`   - Validators: ${status.agentsByType.validator}`);
    console.log(`   - Evolvers: ${status.agentsByType.evolver}`);
    console.log(`📋 Queue Length: ${status.queueLength}`);
    console.log(`🧬 Generation: ${status.generation}`);

    if (this.config.server) {
      console.log(`🌐 HTTP Server: http://${this.config.server.host}:${this.config.server.port}`);
    }

    console.log('─'.repeat(50));
    console.log('\n✅ SEAM is ready! Use one of the following methods to interact:');

    if (this.config.server) {
      console.log(`\n1. HTTP API:`);
      console.log(`   curl http://localhost:${this.config.server.port}/health`);
      console.log(`   curl -X POST http://localhost:${this.config.server.port}/mesh/submit \\\n        -H "Content-Type: application/json" \\\n        -d '{"description": "Your task here", "complexity": "medium"}'`);
    }

    console.log('\n2. Programmatic:');
    console.log(`   const task = await mesh.submitTask("Your task");`);
    console.log(`   const result = await mesh.getResult(task.id);`);

    console.log('\n');
  }

  /**
   * 设置信号处理
   */
  private setupSignalHandlers(): void {
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }
}

// ==================== 启动 ====================

async function main(): Promise<void> {
  // 1. 尝试从配置文件加载
  let config = await loadConfigFromFile('./seam-config.json');

  // 2. 否则从环境变量加载
  if (!config) {
    config = loadConfigFromEnv();
  }

  // 3. 启动应用
  const app = new SeamApplication(config);
  await app.start();
}

// 启动
main().catch((error) => {
  console.error('[SEAM] Fatal error:', error);
  process.exit(1);
});

export { SeamApplication, loadConfigFromEnv };
export default SeamApplication;
