import type { WebpackEnv, DotenvEnv } from 'types/env';
import type { Configuration } from 'webpack';
import { DefinePlugin } from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
import WebpackBar from 'webpackbar';
import path from 'path';
import Dotenv from 'dotenv-webpack';
import packageJSON from './package.json';

/**
 * @description: 获取外部依赖集合
 * @return {Record<string, string>} 外部依赖集合
 */
function getExternalsSet(): Record<string, string> {
  let set: Record<string, string> = {};
  for (let key in packageJSON.dependencies) {
    set[key] = `commonjs ${key}`;
  }
  return set;
}

/**
 * @description: 获取环境变量
 * @param {WebpackEnv} env 命令行传入的环境变量
 * @return {Record<string, string>} 环境变量数据
 */
function getDotenv(env: WebpackEnv) {
  const dotenvPlugin = new Dotenv({
    defaults: './.env',
    path: env.mode === 'development' ? './.env.dev' : './.env.prod'
  }) as any;
  const dotenv: DotenvEnv = { ...dotenvPlugin.gatherVariables(), ...env };
  const defineEnvSet = dotenvPlugin.formatData({ variables: dotenv, target: 'node', version: '5' });
  return { dotenv, defineEnvSet };
}

export default (env: WebpackEnv): Configuration => {
  const { dotenv, defineEnvSet } = getDotenv(env);

  return {
    mode: dotenv.mode,
    target: 'node',
    entry: path.resolve(__dirname, './src/main.ts'),
    output: {
      filename: 'app.js',
      path: path.resolve(__dirname, './dist'),
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, './src/')
      }
    },
    plugins: [
      new DefinePlugin(defineEnvSet),
      new WebpackBar(),
      new CopyPlugin({
        patterns: [
          {
            from: './public',
            to: './public'
          },
          {
            from: './config.yml',
            to: dotenv.config_file
          }
        ]
      })
    ],
    externals: getExternalsSet()
  };
};
