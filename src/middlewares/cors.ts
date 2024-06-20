import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { NextFunction } from 'express';

/**
 * @description: 处理跨域-中间件
 * @param {RouteRequest} req 请求
 * @param {RouteResponse} res 响应
 * @param {NextFunction} next 通过函数
 */
export async function cors(req: RouteRequest, res: RouteResponse, next: NextFunction) {
  //设置允许跨域的域名，*代表允许任意域名跨域
  res.header('Access-Control-Allow-Origin', '*');
  //允许的header类型
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Content-Length, Authorization, Accept, X-Requested-With'
  );
  //跨域允许的请求方式
  res.header('Access-Control-Allow-Methods', 'DELETE,PUT,POST,GET,OPTIONS');
  if (req.method.toLowerCase() == 'options') {
    res.sendStatus(200).send(); //让options尝试请求快速结束
  } else {
    next();
  }
}
