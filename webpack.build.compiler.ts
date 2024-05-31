import type { WebpackEnv } from 'types/env';
import webpack from 'webpack';
import webpackConfig from './webpack.config';
import { program } from 'commander';
import { merge } from 'webpack-merge';
import CopyPlugin from 'copy-webpack-plugin';

const webpackEnv = program
  .option('-m, --mode <mode>', '打包模式', 'production')
  .parse(process.argv)
  .opts() as WebpackEnv; // 命令行参数

const defaultWebpackConfig = webpackConfig(webpackEnv); // 默认webpack配置

const compiler = webpack(
  merge(defaultWebpackConfig, {
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: './package.json',
            to: './package.json',
            transform(content) {
              const json = JSON.parse(content.toString());
              return JSON.stringify(
                {
                  name: json.name,
                  version: json.version,
                  private: json.private,
                  dependencies: json.dependencies
                },
                null,
                2
              );
            }
          }
        ]
      })
    ]
  })
); // webpack编译器

compiler.run((err, stats) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log(
    stats?.toString({
      chunks: false, // 使构建过程更静默无输出
      colors: true, // 在控制台展示颜色
      errorDetails: true // 向错误添加详细信息
    })
  );
});
