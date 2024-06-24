import type { LoginRecordsTable, UsersTable } from 'types/src/utils/database';
import type { NextFunction } from 'express';
import { responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { defineResponseBody } from '@/utils/router';

/**
 * @description: 身份验证-中间件
 * @param {RouteRequest} req 请求
 * @param {RouteResponse} res 响应
 * @param {NextFunction} next 通过函数
 */
export async function authorization(
  req: RouteRequest,
  res: RouteResponse<ResponseBody>,
  next: NextFunction
) {
  const { authorization } = req.headers;

  if (!authorization) {
    // token未携带
    res.json(defineResponseBody({ code: responseCode.reLogin, msg: '当前还未登录' }));
    return;
  }

  const loginRecord = useDatabase()
    .prepare<LoginRecordsTable['token'], Pick<LoginRecordsTable, 'token_expires_date' | 'account'>>(
      `SELECT token_expires_date, account FROM login_records WHERE token = ?;`
    )
    .get(authorization);
  if (!loginRecord || new Date(loginRecord.token_expires_date || 0).getTime() <= Date.now()) {
    // token不再使用 或者 token已过期
    res.json(defineResponseBody({ code: responseCode.reLogin, msg: 'token已失效, 请重新登录' }));
    return;
  }

  const userData = useDatabase()
    .prepare<UsersTable['account'], UsersTable>(`SELECT * FROM users WHERE account = ?;`)
    .get(loginRecord.account);
  if (!userData) {
    // 用户不存在
    res.json(defineResponseBody({ code: responseCode.reLogin, msg: '用户不存在, 请重新登录' }));
    return;
  }
  if (userData.status !== 'enable') {
    // 账号状态异常
    res.json(defineResponseBody({ code: responseCode.reLogin, msg: '账号状态异常, 请重新登录' }));
    return;
  }

  req.locals = { token: authorization, user: userData };

  next();
}
