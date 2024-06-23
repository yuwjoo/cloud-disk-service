import type { Request, Response, NextFunction } from 'express';
import type { responseCode } from '@/utils/router';
import type { UsersTable } from 'types/src/utils/database';

export interface ResponseBody<T = any> {
  code: responseCode; // 响应码
  data?: T; // 响应数据
  msg: string; // 响应消息
} // 响应body

export interface RouteRequest<Body = any, Query = any> extends Request<any, any, Body, Query> {} // 路由请求对象

export interface RouteResponse<Body = any, Locals = RouteResponseLocals>
  extends Response<ResponseBody<Body>, Locals> {} // 路由响应对象

export interface RouteResponseLocals {
  token: string; // 用户token
  user: UsersTable; // 用户信息
} // 路由响应对象-本地数据

export interface DefineRouteConfig {
  method: DefineRouteConfigMethod;
  handler: DefineRouteConfigHandler[] | DefineRouteConfigHandler;
  options?: DefineRouteConfigOptions;
} // 定义路由-配置

export type DefineRouteConfigMethod = 'post' | 'get' | 'put' | 'delete'; // 定义路由-配置-请求方式

export type DefineRouteConfigHandler = (
  req: RouteRequest,
  res: RouteResponse,
  next: NextFunction
) => Promise<void>; // 定义路由-配置-处理函数

export interface DefineRouteConfigOptions {
  authorization?: boolean; // 是否需要身份认证
  disabled?: boolean; // 是否禁用该接口
  requestBody?: 'json' | 'urlencoded' | 'text' | 'raw'; // 请求给过来的body数据类型
} // 定义路由-配置-选项

export interface DefineRouteReturn {
  method: DefineRouteConfigMethod;
  handlers: DefineRouteConfigHandler[];
  options: Required<DefineRouteConfigOptions>;
} // 定义路由-返回

export interface DefineResponseBodyOptions<T> {
  code?: ResponseBody['code']; // 响应码
  data?: T; // 响应数据
  msg?: ResponseBody['msg']; // 响应消息
} // 定义响应body-选项

export interface defineResponseBodyReturn<T> extends ResponseBody<T> {} // 定义响应body-返回

export {};
