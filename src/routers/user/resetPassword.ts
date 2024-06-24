import type { UsersTable } from 'types/src/utils/database';
import type {
  ResetPasswordRequestBody,
  ResetPasswordRequestQuery,
  ResetPasswordResponseBody
} from 'types/src/routers/user/resetPassword';
import { useDatabase } from '@/utils/database';
import { createHash } from '@/utils/secure';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';

export default defineRoute({
  method: 'post',
  handler: resetPassword,
  options: { authorization: false }
});

/**
 * @description: 重置密码接口
 * @param {RouteRequest} req 请求
 * @param {RouteResponse} res 响应
 */
async function resetPassword(
  req: RouteRequest<ResetPasswordRequestBody, ResetPasswordRequestQuery>,
  res: RouteResponse<ResetPasswordResponseBody>
) {
  const { body } = req;

  if (!body || !body.account || !body.oldPassword || !body.newPassword) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '缺少参数' }));
    return;
  }

  if (body.oldPassword === body.newPassword) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '新密码不能与旧密码相同' }));
    return;
  }

  const userData = useDatabase()
    .prepare<UsersTable['account'], Pick<UsersTable, 'password' | 'account'>>(
      `SELECT password, account FROM users WHERE account = ?;`
    )
    .get(body.account); // 查询用户

  if (!userData) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '该账号不存在' }));
    return;
  }

  if (userData.password !== createHash(body.oldPassword)) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '旧密码不正确' }));
    return;
  }

  useDatabase().transaction(() => {
    useDatabase()
      .prepare<Pick<UsersTable, 'account' | 'password'>>(
        `UPDATE users SET password = $password WHERE account = $account;`
      )
      .run({ account: userData.account, password: createHash(body.newPassword) }); // 修改密码

    useDatabase()
      .prepare<string>(`DELETE FROM tokens WHERE user_account = ?;`)
      .run(userData.account); // 删除该账号所有token记录
  })();

  res.json(defineResponseBody({ msg: '修改成功' }));
}
