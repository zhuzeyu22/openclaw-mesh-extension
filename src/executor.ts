/**
 * 真实任务执行引擎
 * 支持调用外部 AI API 执行实际任务
 */

import type { Task, AgentType } from './types.js';

export interface ExecutorConfig {
  /** AI 提供商 */
  provider: 'openai' | 'anthropic' | 'local';
  /** API Key */
  apiKey?: string;
  /** API 基础 URL */
  baseUrl?: string;
  /** 模型名称 */
  model?: string;
  /** 超时时间（毫秒） */
  timeoutMs?: number;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    finishReason?: string;
  };
}

/**
 * 任务执行器
 */
export class TaskExecutor {
  private config: ExecutorConfig;

  constructor(config: ExecutorConfig) {
    this.config = {
      timeoutMs: 60000,
      ...config,
    };
  }

  /**
   * 执行任务
   */
  async execute(task: Task, agentType: AgentType): Promise<ExecutionResult> {
    const systemPrompt = this.getSystemPrompt(agentType);
    const userPrompt = this.buildTaskPrompt(task, agentType);

    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.callOpenAI(systemPrompt, userPrompt);
        case 'anthropic':
          return await this.callAnthropic(systemPrompt, userPrompt);
        case 'local':
          return await this.callLocal(systemPrompt, userPrompt);
        default:
          throw new Error(`Unknown provider: ${this.config.provider}`);
      }
    } catch (error) {
      return {
        success: false,
        output: `执行失败: ${error}`,
      };
    }
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(agentType: AgentType): string {
    const prompts: Record<AgentType, string> = {
      orchestrator: `你是任务协调专家。你的职责是：
1. 分析任务的复杂度和类型
2. 将复杂任务分解为可执行的子任务
3. 制定执行计划
4. 协调其他智能体的工作

输出格式：
- 任务分析：[复杂度评估]
- 执行计划：[步骤列表]
- 资源分配：[需要的智能体类型]`,

      researcher: `你是技术研究专家。你的职责是：
1. 深入研究指定技术主题
2. 收集和整理最新信息
3. 对比不同方案的优缺点
4. 提供详细的研究报告

输出格式：
- 研究摘要：[核心发现]
- 详细分析：[技术细节]
- 方案对比：[优缺点对比表]
- 推荐方案：[最佳选择及理由]`,

      executor: `你是代码执行专家。你的职责是：
1. 根据需求编写高质量代码
2. 实现具体功能
3. 确保代码的正确性和可读性
4. 提供使用说明

输出格式：
- 实现思路：[设计思路]
- 代码：[完整的可运行代码]
- 使用说明：[如何运行和使用]`,

      validator: `你是质量验证专家。你的职责是：
1. 审查代码质量
2. 检查潜在问题
3. 验证功能正确性
4. 提供改进建议

输出格式：
- 质量评分：[1-100分]
- 问题列表：[发现的问题]
- 改进建议：[具体改进方案]
- 验证结果：[是否通过]`,

      evolver: `你是系统优化专家。你的职责是：
1. 分析系统瓶颈
2. 提出优化策略
3. 预测改进效果
4. 制定进化计划

输出格式：
- 瓶颈分析：[当前问题]
- 优化策略：[改进方案]
- 预期效果：[性能提升预测]
- 实施计划：[执行步骤]`,
    };

    return prompts[agentType];
  }

  /**
   * 构建任务提示词
   */
  private buildTaskPrompt(task: Task, agentType: AgentType): string {
    return `任务描述: ${task.description}
复杂度: ${task.complexity}
提交者: ${task.submitter}
创建时间: ${task.createdAt.toISOString()}

请根据你的角色职责，完成这个任务。`;
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(system: string, user: string): Promise<ExecutionResult> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { total_tokens?: number };
      model?: string;
    };
    return {
      success: true,
      output: data.choices[0]?.message?.content || '',
      metadata: {
        tokensUsed: data.usage?.total_tokens,
        model: data.model,
        finishReason: data.choices[0]?.finish_reason,
      },
    };
  }

  /**
   * 调用 Anthropic API
   */
  private async callAnthropic(system: string, user: string): Promise<ExecutionResult> {
    const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch(`${this.config.baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      model?: string;
    };
    return {
      success: true,
      output: data.content?.[0]?.text || '',
      metadata: {
        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        model: data.model,
      },
    };
  }

  /**
   * 调用本地模型
   */
  private async callLocal(system: string, user: string): Promise<ExecutionResult> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model || 'llama2',
        prompt: `${system}\n\n${user}`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local API error: ${response.status}`);
    }

    const data = await response.json() as { response?: string };
    return {
      success: true,
      output: data.response || '',
    };
  }
}

export default TaskExecutor;
