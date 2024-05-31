import type { WebpackEnv } from 'types/env';
import type { ChildProcess } from 'child_process';
import webpack from 'webpack';
import webpackConfig from './webpack.config';
import { program } from 'commander';
import { spawn } from 'child_process';
import { merge } from 'webpack-merge';
import path from 'path';

class ChildServer {
  process: ChildProcess | null; // 当前进程
  command: string; // 指令
  args: string[]; // 参数

  /**
   * @description: 构造函数
   * @param {string} command 指令
   * @param {string[]} args 参数
   */
  constructor(command: string, args: string[]) {
    this.process = null;
    this.command = command;
    this.args = args;
  }

  /**
   * @description: 重新启动服务
   */
  restart() {
    this.kill();
    this.process = spawn(this.command, this.args);

    this.process.stdout?.on('data', (data) => {
      console.log(data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      console.error(data.toString());
    });
  }

  /**
   * @description: 杀死服务
   */
  kill() {
    if (!this.process || !this.process.kill) return;
    this.process.kill('SIGTERM');
    this.process = null;
  }
}

const webpackEnv = program
  .option('-m, --mode <mode>', '打包模式', 'development')
  .parse(process.argv)
  .opts() as WebpackEnv; // 命令行参数

const defaultWebpackConfig = webpackConfig(webpackEnv); // 默认webpack配置

const childServer = new ChildServer('node', [
  path.resolve(
    defaultWebpackConfig.output?.path as string,
    defaultWebpackConfig.output?.filename as string
  )
]); // 子服务操作对象

const compiler = webpack(merge(defaultWebpackConfig)); // webpack编译器

compiler.watch(
  {
    aggregateTimeout: 600,
    ignored: /node_modules/
  },
  (err, stats) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(
      stats?.toString({
        chunks: false, // 使构建过程更静默无输出
        colors: true // 在控制台展示颜色
      })
    );
    childServer.restart(); // 编译完成后重启子服务
  }
);
