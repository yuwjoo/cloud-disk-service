import type { LoginRecordsTable, UsersTable } from 'types/src/utils/database';
import type {
  ResetPasswordRequestBody,
  ResetPasswordRequestQuery,
  ResetPasswordResponseBody
} from 'types/src/routers/user/resetPassword';
import { useDatabase } from '@/utils/database';
import { createHash } from '@/utils/secure';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';

/**
 * @description: 重置密码接口
 */
export default defineRoute({
  method: 'post',
  options: { authorization: false },
  handler: async (
    req: RouteRequest<ResetPasswordRequestBody, ResetPasswordRequestQuery, void>,
    res: RouteResponse<ResetPasswordResponseBody>
  ) => {
    const { body } = req;

    if (!body || !body.account || !body.oldPassword || !body.newPassword) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '缺少参数' }));
      return;
    }

    if (body.oldPassword === body.newPassword) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '新密码不能与旧密码相同' }));
      return;
    }

    const userRow = selectUser(body.account);

    if (!userRow) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '该账号不存在' }));
      return;
    }

    if (userRow.password !== createHash(body.oldPassword)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '旧密码不正确' }));
      return;
    }

    useDatabase().transaction(() => {
      updatePassword({ account: userRow.account, password: createHash(body.newPassword) });
      clearAccountTokens({ account: userRow.account });
    })();

    res.json(defineResponseBody({ msg: '修改成功' }));
  }
});

/**
 * @description: 查询用户
 */
function selectUser(
  params: UsersTable['account']
): Pick<UsersTable, 'password' | 'account'> | undefined {
  const sql = `SELECT password, account FROM users WHERE account = ?;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectUser>>(sql).get(params);
}

/**
 * @description: 修改密码
 */
function updatePassword(params: Pick<UsersTable, 'account' | 'password'>) {
  const sql = `UPDATE users SET password = $password WHERE account = $account;`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}

/**
 * @description: 清除该账号token记录
 */
function clearAccountTokens(params: Pick<LoginRecordsTable, 'account'>) {
  const sql = `DELETE FROM login_records WHERE account = $account;`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
