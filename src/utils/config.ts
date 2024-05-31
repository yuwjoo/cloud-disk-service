import type { Config } from 'types/src/utils/config';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { error } from './log';

let config: Readonly<Config>; // 配置数据

/**
 * @description: 使用配置
 * @return {Config} 配置json
 */
export function useConfig(): Readonly<Config> {
  if (config) return config;

  try {
    const configTxt = fs.readFileSync(path.resolve(__dirname, process.env.config_file), 'utf-8');
    config = Object.freeze(yaml.load(configTxt) as Config);
    return config;
  } catch (err) {
    error('配置文件解析错误:', err);
    throw err;
  }
}
