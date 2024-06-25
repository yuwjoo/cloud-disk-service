import type { LoginRecordsTable } from 'types/src/utils/database';
import type {
  LogoutRequestBody,
  LogoutRequestQuery,
  LogoutResponseBody
} from 'types/src/routers/user/logout';
import { useDatabase } from '@/utils/database';
import { defineResponseBody, defineRoute } from '@/utils/router';

/**
 * @description: 退出登录接口
 */
export default defineRoute({
  method: 'get',
  options: { authorization: false },
  handler: async (
    req: RouteRequest<LogoutRequestBody, LogoutRequestQuery, void>,
    res: RouteResponse<LogoutResponseBody>
  ) => {
    const { authorization } = req.headers;

    if (authorization) deleteToken(authorization);

    res.json(defineResponseBody());
  }
});

/**
 * @description: 删除指定token记录
 */
function deleteToken(params: LoginRecordsTable['token']) {
  const sql = `DELETE FROM login_records WHERE token = ?;`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
