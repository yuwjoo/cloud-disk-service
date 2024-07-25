import type { responseCode } from '@/utils/router';
import type OSS from 'ali-oss';
import type { Request, Response } from 'express';
import type { UsersTable } from 'types/src/utils/database';

declare global {
  interface Config {
    platform: 'win' | 'linux'; // 运行平台
    protocol: string; // 协议
    host: string; // 服务器host
    port: number; // 监听端口
    tempTokenExpirationTime: number; // 临时token过期时间（单位：秒）
    tokenExpirationTime: number; // 长期token过期时间（单位：秒）
    databasePath: string; // 数据库路径
    ossStsExpirationTime: number; // oss临时凭证过期时间（单位：秒）
    secretKeyBase64: string; // 安全密钥base64字符串
    ivBase64: string; // iv base64字符串
    publicKeyBase64: string; // 非对称加密公钥base64字符串
    privateKeyBase64: string; // 非对称加密私钥base64字符串
    admin: {
      account: string; // 默认账号
      password: string; // 默认密码
    };
    oss: {
      bucketName: string; // bucket名称
      adminAccount: string; // admin账号
      adminAccessKeyID: string; // admin AccessKeyID
      adminAccessKeySecret: string; // admin AccessKeySecret
      stsAccount: string; // sts账号
      stsAccessKeyID: string; // sts AccessKeyID
      stsAccessKeySecret: string; // sts AccessKeySecret
      stsRAMRole: string; // sts角色
      uploadPublicKeyBase64: string; // 上传回调签名公钥base64字符串
    };
  }

  interface ResponseBody<T = any> {
    code: responseCode; // 响应码
    data?: T; // 响应数据
    msg: string; // 响应消息
  } // 响应body

  interface CustomLocals {
    token: string; // 用户token
    user: UsersTable; // 用户信息
  } // 自定义本地数据

  interface RouteRequest<Body = void, Query = void, Locals = CustomLocals>
    extends Request<any, any, Body, Query> {
    locals: Locals;
  } // 路由请求对象

  interface RouteResponse<Body = void> extends Response<Body> {} // 路由响应对象
}
