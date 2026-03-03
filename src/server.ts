/**
 * SEAM HTTP API Server
 * 提供 RESTful API 接口
 */

import http from 'http';
import { SelfEvolvingMesh } from './mesh.js';
import type { MeshConfig } from './types.js';

export interface ServerConfig {
  port?: number;
  host?: string;
  apiKey?: string;
}

export class SeamServer {
  private mesh: SelfEvolvingMesh;
  private config: ServerConfig;
  private server?: http.Server;

  constructor(mesh: SelfEvolvingMesh, config: ServerConfig = {}) {
    this.mesh = mesh;
    this.config = {
      port: 18789,
      host: '0.0.0.0',
      ...config,
    };
  }

  /**
   * 启动 HTTP 服务器
   */
  async start(): Promise<void> {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        console.log(`[SEAM Server] Running on http://${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server!.on('error', reject);
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => {
        console.log('[SEAM Server] Stopped');
        resolve();
      });
    });
  }

  /**
   * 处理 HTTP 请求
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // API 鉴权
    if (this.config.apiKey) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${this.config.apiKey}`) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    try {
      switch (path) {
        // 健康检查
        case '/health':
          this.sendJson(res, { status: 'ok', timestamp: new Date().toISOString() });
          break;

        // 获取网格状态
        case '/mesh/status':
          this.sendJson(res, this.mesh.getStatus());
          break;

        // 获取智能体列表
        case '/mesh/agents':
          this.sendJson(res, { agents: this.mesh.getAgents() });
          break;

        // 提交任务
        case '/mesh/submit':
          if (req.method !== 'POST') {
            this.sendError(res, 405, 'Method not allowed');
            return;
          }
          await this.handleSubmitTask(req, res);
          break;

        // 查询任务结果
        case '/mesh/result':
          await this.handleGetResult(url, res);
          break;

        // 获取进化计划
        case '/mesh/plan':
          this.sendJson(res, {
            currentPlan: this.mesh.getCurrentPlan(),
            need: this.mesh.checkEvolutionNeed(),
          });
          break;

        // 获取进化历史
        case '/mesh/history':
          this.sendJson(res, { history: this.mesh.getEvolutionHistory() });
          break;

        // 触发进化
        case '/mesh/evolve':
          if (req.method !== 'POST') {
            this.sendError(res, 405, 'Method not allowed');
            return;
          }
          const evolveResult = await this.mesh.evolve();
          this.sendJson(res, { message: evolveResult });
          break;

        // 预测未来需求
        case '/mesh/predict':
          const days = parseInt(url.searchParams.get('days') || '7', 10);
          this.sendJson(res, this.mesh.predictFutureNeeds(days));
          break;

        // 404
        default:
          this.sendError(res, 404, 'Not found');
      }
    } catch (error) {
      console.error('[SEAM Server] Error:', error);
      this.sendError(res, 500, `Internal error: ${error}`);
    }
  }

  /**
   * 处理提交任务请求
   */
  private async handleSubmitTask(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const data = JSON.parse(body);

    if (!data.description) {
      this.sendError(res, 400, 'Missing description');
      return;
    }

    const task = await this.mesh.submitTask(data.description, {
      complexity: data.complexity || 'medium',
      submitter: data.submitter || 'api',
      metadata: data.metadata,
    });

    this.sendJson(res, {
      taskId: task.id,
      status: 'submitted',
      createdAt: task.createdAt,
    });
  }

  /**
   * 处理获取结果请求
   */
  private async handleGetResult(url: URL, res: http.ServerResponse): Promise<void> {
    const taskId = url.searchParams.get('taskId');
    const timeout = parseInt(url.searchParams.get('timeout') || '30000', 10);

    if (!taskId) {
      this.sendError(res, 400, 'Missing taskId');
      return;
    }

    const result = await this.mesh.getResult(taskId, timeout);

    if (result) {
      this.sendJson(res, {
        found: true,
        result,
      });
    } else {
      this.sendJson(res, {
        found: false,
        message: 'Task not found or still pending',
      });
    }
  }

  /**
   * 读取请求体
   */
  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  /**
   * 发送 JSON 响应
   */
  private sendJson(res: http.ServerResponse, data: unknown): void {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * 发送错误响应
   */
  private sendError(res: http.ServerResponse, status: number, message: string): void {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(status);
    res.end(JSON.stringify({ error: message }, null, 2));
  }
}

export default SeamServer;
