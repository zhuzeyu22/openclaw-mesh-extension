/**
 * OpenClaw Plugin SDK 类型声明
 * 由于 openclaw 是 peer dependency，我们在这里声明需要的类型
 */

declare module 'openclaw/plugin-sdk' {
  export interface Context {
    config: {
      get: (key: string) => unknown;
    };
  }

  export interface Skill {
    name: string;
    description: string;
    version: string;
    initialize?: (context: Context) => Promise<void>;
    destroy?: () => Promise<void>;
    getTools?: () => Tool[];
    onMessage?: (message: string, context: Context) => Promise<string | null>;
  }

  export interface Tool {
    name: string;
    description: string;
    parameters?: Record<string, ParameterSchema>;
    handler: (params: any) => Promise<any>;
  }

  export interface ParameterSchema {
    type: string;
    description?: string;
    required?: boolean;
    enum?: string[];
    default?: unknown;
  }
}
