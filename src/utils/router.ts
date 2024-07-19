import type { Express, NextFunction } from 'express';
import type {
  DefineRouteReturn,
  DefineRouteConfig,
  DefineResponseBodyOptions,
  defineResponseBodyReturn
} from 'types/src/utils/router';
import { authorization } from '@/middlewares/authorization';
import { error } from './log';
import express from 'express';

/**
 * @description: 响应code
 */
export enum responseCode {
  success = 20200, // 请求成功
  error = 40400, // 请求错误
  reLogin = 40401, // 重新登录
  serverError = 50501 // 服务器错误
}

/**
 * @description: 定义响应body
 * @param {DefineResponseBodyOptions<T>} options 配置
 * @return {defineResponseBodyReturn<T>} 响应数据
 */
export function defineResponseBody<T = any>(
  options: DefineResponseBodyOptions<T> = {}
): defineResponseBodyReturn<T> {
  return {
    code: options.code || responseCode.success,
    data: options.data,
    msg: options.msg || '请求成功'
  };
}

/**
 * @description: 定义路由
 * @param {DefineRouteConfig} config 配置
 * @return {DefineRouteReturn} 路由数据
 */
export function defineRoute(config: DefineRouteConfig): DefineRouteReturn {
  const options = Object.assign(
    {
      authorization: true,
      disabled: false,
      bodyParser: config.method === 'post' ? 'json' : undefined
    },
    config.options
  );
  const handler = async (
    req: RouteRequest,
    res: RouteResponse<ResponseBody>,
    next: NextFunction
  ) => {
    try {
      await config.handler(req, res, next);
    } catch (err: any) {
      if (typeof err === 'object' && err.code && err.msg) {
        res.json(defineResponseBody({ code: err.code, msg: err.msg }));
      } else {
        error('API名称: ', req.url);
        error('API报错: ', err);
        res.json(defineResponseBody({ code: responseCode.serverError, msg: '服务器内部错误' }));
      }
    }
  };

  return { method: config.method, options, middlewares: config.middlewares || [], handler };
}

/**
 * @description: 加载路由线路
 * @param {Express} app 服务实例
 */
export function loadRouter(app: Express) {
  try {
    const routers: __WebpackModuleApi.RequireContext = require.context('@/routers', true, /\.ts$/); // 获取所有路由模块

    for (let key of routers.keys()) {
      const { method, middlewares, handler, options } = routers(key).default as DefineRouteReturn;
      const routePath: string = '/' + (key.match(/^\.[\/\\](.+)\.ts$/)?.[1] || '');
      let beforeMiddlewares: any = [];

      if (options.disabled) continue;

      if (options.authorization) beforeMiddlewares.push(authorization);

      switch (options.bodyParser) {
        case 'json':
          beforeMiddlewares.push(express.json()); // 处理json数据
          break;
        case 'urlencoded':
          beforeMiddlewares.push(express.urlencoded({ extended: true })); // 处理表单数据
          break;
        case 'text':
          beforeMiddlewares.push(express.text({ type: '*/*' })); // 处理文本数据
          break;
        case 'raw':
          beforeMiddlewares.push(express.raw({ type: '*/*' })); // 处理buffer数据
          break;
      }

      app[method](routePath, ...beforeMiddlewares, ...middlewares, handler);
    }
  } catch (err) {
    error('路由加载出错：' + (err as Error).stack);
  }
}
