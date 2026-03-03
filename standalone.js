#!/usr/bin/env node
/**
 * SEAM (Self-Evolving Agent Mesh) 独立运行模式
 *
 * 用于在不支持插件的 OpenClaw 版本上运行网格
 */

const { SelfEvolvingMesh } = require('./dist/mesh.js');

const DEFAULT_CONFIG = {
  genesisAgents: [
    { type: 'orchestrator', count: 1 },
    { type: 'researcher', count: 2 },
    { type: 'executor', count: 3 },
    { type: 'validator', count: 1 },
    { type: 'evolver', count: 1 },
  ],
  evolution: {
    enabled: true,
    intervalMinutes: 360,
    selectionPressure: 0.3,
    mutationRate: 0.2,
  },
  autoStart: true,
  interceptMessages: false,
};

async function main() {
  console.log('🚀 Starting SEAM (Self-Evolving Agent Mesh)...');
  console.log('');

  const mesh = new SelfEvolvingMesh(DEFAULT_CONFIG);

  // 启动网格
  await mesh.start();

  // 显示状态
  const status = mesh.getStatus();
  console.log('');
  console.log('✅ SEAM Mesh Started!');
  console.log('');
  console.log('Status:');
  console.log(`  - Running: ${status.isRunning}`);
  console.log(`  - Agents: ${status.agentCount}`);
  console.log(`  - Generation: ${status.generation}`);
  console.log(`  - Queue: ${status.queueLength}`);
  console.log('');
  console.log('Available commands:');
  console.log('  - Check status: node -e "const {mesh} = require(\'./standalone.js\'); console.log(mesh.getStatus());"');
  console.log('  - List agents: node -e "const {mesh} = require(\'./standalone.js\'); console.log(mesh.getAgents());"');
  console.log('  - Stop: Ctrl+C');
  console.log('');

  // 保持进程运行
  process.stdin.resume();

  // 优雅退出
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await mesh.stop();
    console.log('✅ Stopped');
    process.exit(0);
  });

  return mesh;
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { main, DEFAULT_CONFIG };
