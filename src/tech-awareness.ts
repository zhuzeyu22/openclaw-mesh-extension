/**
 * 科技资讯感知模块
 * 主动搜集技术趋势，让网格"了解世界"
 */

import type { AgentType, AgentDNA } from './types.js';
import { generateId } from './utils.js';

interface TechTrend {
  id: string;
  category: 'ai' | 'web' | 'cloud' | 'security' | 'database' | 'language';
  title: string;
  summary: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  publishedAt: Date;
  relevance: number; // 0-1，与当前系统的相关度
}

interface CapabilityGap {
  capability: string;
  currentLevel: number;
  requiredLevel: number;
  urgency: 'low' | 'medium' | 'high';
  relatedTrends: string[];
}

/**
 * 科技资讯感知器
 */
export class TechAwareness {
  private trends: Map<string, TechTrend> = new Map();
  private awarenessInterval?: NodeJS.Timeout;
  private readonly maxTrends = 100;

  // 模拟的科技资讯源
  private readonly mockSources = [
    { category: 'ai' as const, patterns: ['LLM', 'GPT', 'Claude', 'AI Agent', 'RAG', 'Embedding'] },
    { category: 'web' as const, patterns: ['React', 'Vue', 'Next.js', 'WebAssembly', 'HTTP/3'] },
    { category: 'cloud' as const, patterns: ['Kubernetes', 'Docker', 'Serverless', 'Edge Computing'] },
    { category: 'security' as const, patterns: ['Zero Trust', 'OAuth', 'Encryption', 'Vulnerability'] },
    { category: 'database' as const, patterns: ['Vector DB', 'GraphQL', 'Redis', 'PostgreSQL'] },
    { category: 'language' as const, patterns: ['TypeScript', 'Rust', 'Go', 'Python', 'Wasm'] },
  ];

  /**
   * 启动资讯感知
   */
  start(intervalMinutes: number = 60): void {
    console.log(`[TechAwareness] Started (interval: ${intervalMinutes}min)`);

    // 初始扫描
    this.scanTechTrends();

    // 定期扫描
    this.awarenessInterval = setInterval(() => {
      this.scanTechTrends();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * 停止资讯感知
   */
  stop(): void {
    if (this.awarenessInterval) {
      clearInterval(this.awarenessInterval);
    }
  }

  /**
   * 扫描科技资讯（模拟）
   */
  private async scanTechTrends(): Promise<void> {
    console.log('[TechAwareness] Scanning tech trends...');

    // 模拟发现新趋势
    const newTrends = this.generateMockTrends();

    for (const trend of newTrends) {
      if (!this.trends.has(trend.id)) {
        this.trends.set(trend.id, trend);
        console.log(`[TechAwareness] New trend: [${trend.category}] ${trend.title} (impact: ${trend.impact})`);
      }
    }

    // 清理旧趋势
    this.cleanupOldTrends();
  }

  /**
   * 生成模拟趋势数据
   */
  private generateMockTrends(): TechTrend[] {
    const trends: TechTrend[] = [];
    const now = new Date();

    // 根据当前时间生成一些"新"趋势
    const mockTrends = [
      {
        category: 'ai' as const,
        title: '多模态AI Agent架构兴起',
        summary: '结合文本、图像、音频的多模态AI Agent正在成为主流',
        impact: 'high' as const,
      },
      {
        category: 'web' as const,
        title: 'Edge AI推理优化技术突破',
        summary: '在边缘设备上运行大模型的技术取得重大进展',
        impact: 'critical' as const,
      },
      {
        category: 'security' as const,
        title: 'AI驱动的安全防护系统',
        summary: '利用AI实时检测和响应安全威胁的系统越来越普及',
        impact: 'medium' as const,
      },
      {
        category: 'database' as const,
        title: '向量数据库性能优化新方案',
        summary: '新型索引算法使向量搜索速度提升10倍',
        impact: 'high' as const,
      },
      {
        category: 'cloud' as const,
        title: 'Serverless架构成本优化',
        summary: '新的冷启动优化技术大幅降低Serverless成本',
        impact: 'medium' as const,
      },
    ];

    // 随机选择1-2个趋势作为"新发现"
    const count = Math.floor(Math.random() * 2) + 1;
    const selected = mockTrends.sort(() => Math.random() - 0.5).slice(0, count);

    for (const item of selected) {
      trends.push({
        id: generateId('trend'),
        category: item.category,
        title: item.title,
        summary: item.summary,
        impact: item.impact,
        source: 'TechRadar',
        publishedAt: now,
        relevance: Math.random() * 0.5 + 0.5, // 0.5-1.0
      });
    }

    return trends;
  }

  /**
   * 分析能力缺口
   */
  analyzeCapabilityGap(agents: AgentDNA[]): CapabilityGap[] {
    const gaps: CapabilityGap[] = [];
    const recentTrends = this.getRecentTrends(24); // 最近24小时的趋势

    // 根据趋势识别能力缺口
    for (const trend of recentTrends) {
      if (trend.relevance < 0.7) continue;

      // 检查当前智能体是否具备相关能力
      const hasCapability = agents.some(agent =>
        agent.capabilities.some(cap =>
          cap.name.toLowerCase().includes(trend.category) ||
          cap.description.toLowerCase().includes(trend.title.toLowerCase())
        )
      );

      if (!hasCapability && trend.impact !== 'low') {
        gaps.push({
          capability: `${trend.category}-awareness`,
          currentLevel: 0,
          requiredLevel: trend.impact === 'critical' ? 0.9 : 0.7,
          urgency: trend.impact === 'critical' ? 'high' : 'medium',
          relatedTrends: [trend.id],
        });
      }
    }

    return gaps;
  }

  /**
   * 获取最近的趋势
   */
  getRecentTrends(hours: number = 24): TechTrend[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.trends.values())
      .filter(t => t.publishedAt > cutoff)
      .sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 获取高影响趋势
   */
  getHighImpactTrends(): TechTrend[] {
    return Array.from(this.trends.values())
      .filter(t => t.impact === 'high' || t.impact === 'critical')
      .sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 为特定智能体类型推荐趋势
   */
  getRecommendationsForType(type: AgentType): TechTrend[] {
    const typeMapping: Record<AgentType, string[]> = {
      orchestrator: ['ai', 'cloud'],
      researcher: ['ai', 'database', 'security'],
      executor: ['web', 'language', 'cloud'],
      validator: ['security', 'ai'],
      evolver: ['ai', 'cloud', 'database'],
    };

    const relevantCategories = typeMapping[type];
    return Array.from(this.trends.values())
      .filter(t => relevantCategories.includes(t.category))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);
  }

  /**
   * 生成进化建议
   */
  generateEvolutionSuggestions(): Array<{
    type: 'new-capability' | 'enhance-existing' | 'specialize';
    description: string;
    priority: number;
    trendIds: string[];
  }> {
    const suggestions: Array<{
      type: 'new-capability' | 'enhance-existing' | 'specialize';
      description: string;
      priority: number;
      trendIds: string[];
    }> = [];

    const criticalTrends = Array.from(this.trends.values())
      .filter(t => t.impact === 'critical');

    for (const trend of criticalTrends) {
      suggestions.push({
        type: 'new-capability',
        description: `集成${trend.title}相关能力`,
        priority: trend.relevance * 10,
        trendIds: [trend.id],
      });
    }

    const highTrends = Array.from(this.trends.values())
      .filter(t => t.impact === 'high' && !suggestions.some(s => s.trendIds.includes(t.id)));

    for (const trend of highTrends.slice(0, 2)) {
      suggestions.push({
        type: 'enhance-existing',
        description: `增强对${trend.category}领域的支持`,
        priority: trend.relevance * 7,
        trendIds: [trend.id],
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 清理旧趋势
   */
  private cleanupOldTrends(): void {
    if (this.trends.size <= this.maxTrends) return;

    // 保留高影响和高相关度的趋势
    const sorted = Array.from(this.trends.entries()).sort((a, b) => {
      const scoreA = (a[1].impact === 'critical' ? 4 : a[1].impact === 'high' ? 3 : a[1].impact === 'medium' ? 2 : 1) * a[1].relevance;
      const scoreB = (b[1].impact === 'critical' ? 4 : b[1].impact === 'high' ? 3 : b[1].impact === 'medium' ? 2 : 1) * b[1].relevance;
      return scoreB - scoreA;
    });

    // 删除低分趋势
    const toDelete = sorted.slice(this.maxTrends);
    for (const [id] of toDelete) {
      this.trends.delete(id);
    }
  }

  /**
   * 获取状态报告
   */
  getStatus(): {
    totalTrends: number;
    recentTrends: number;
    highImpactTrends: number;
    topCategories: string[];
  } {
    const allTrends = Array.from(this.trends.values());
    const recent = allTrends.filter(t => t.publishedAt > new Date(Date.now() - 24 * 60 * 60 * 1000));

    const categoryCount = new Map<string, number>();
    for (const trend of allTrends) {
      categoryCount.set(trend.category, (categoryCount.get(trend.category) || 0) + 1);
    }

    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    return {
      totalTrends: allTrends.length,
      recentTrends: recent.length,
      highImpactTrends: allTrends.filter(t => t.impact === 'high' || t.impact === 'critical').length,
      topCategories,
    };
  }
}

export type { TechTrend, CapabilityGap };
