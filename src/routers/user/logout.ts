import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { LoginRecordsTable } from 'types/src/utils/database';
import type { LogoutRequestQuery, LogoutResponseData } from 'types/src/routers/user/logout';
import { useDatabase } from '@/utils/database';
import { defineResponseBody, defineRoute } from '@/utils/router';

export default defineRoute({
  method: 'get',
  handler: logout,
  options: { authorization: false }
});

/**
 * @description: 退出登录接口
 * @param {RouteRequest<any, LogoutRequestQuery>} req 请求
 * @param {RouteResponse<LogoutResponseData>} res 响应
 */
async function logout(
  req: RouteRequest<any, LogoutRequestQuery>,
  res: RouteResponse<LogoutResponseData>
) {
  const token: LoginRecordsTable['token'] | undefined = req.header('Authorization');

  if (token) {
    useDatabase()
      .prepare<LoginRecordsTable['token']>(`DELETE FROM login_records WHERE token = ?;`)
      .run(token); // 删除指定登录记录
  }

  res.json(defineResponseBody({ msg: '已退出登录' }));
}
