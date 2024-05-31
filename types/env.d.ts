export interface WebpackEnv {
  readonly mode: 'development' | 'production'; // 打包模式
}

export interface DotenvEnv extends WebpackEnv {
  readonly config_file: string; // 配置文件路径
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends DotenvEnv {}
  }
}

export {};
