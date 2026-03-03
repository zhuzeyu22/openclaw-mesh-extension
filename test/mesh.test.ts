import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SelfEvolvingMesh } from '../src/mesh';
import type { MeshConfig } from '../src/types';

const TEST_CONFIG: MeshConfig = {
  genesisAgents: [
    { type: 'orchestrator', count: 1 },
    { type: 'executor', count: 2 },
  ],
  evolution: {
    enabled: false, // 测试时禁用进化
    intervalMinutes: 60,
    selectionPressure: 0.3,
    mutationRate: 0.2,
  },
  autoStart: false,
};

describe('SelfEvolvingMesh', () => {
  let mesh: SelfEvolvingMesh;

  beforeEach(() => {
    mesh = new SelfEvolvingMesh(TEST_CONFIG);
  });

  afterEach(async () => {
    await mesh.stop();
  });

  it('should start with genesis agents', async () => {
    await mesh.start();
    const status = mesh.getStatus();

    expect(status.isRunning).toBe(true);
    expect(status.agentCount).toBe(3); // 1 orchestrator + 2 executors
  });

  it('should submit and process task', async () => {
    await mesh.start();

    const task = await mesh.submitTask('测试任务', {
      complexity: 'simple',
    });

    expect(task.id).toBeDefined();
    expect(task.description).toBe('测试任务');

    const result = await mesh.getResult(task.id, 5000);
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
  });

  it('should return correct status', async () => {
    await mesh.start();

    const status = mesh.getStatus();
    expect(status.generation).toBe(1);
    expect(status.agentsByType.orchestrator).toBe(1);
    expect(status.agentsByType.executor).toBe(2);
  });
});
