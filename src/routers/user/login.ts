import type { LoginRecordsTable, RolesTable, UsersTable } from 'types/src/utils/database';
import type {
  LoginRequestBody,
  LoginRequestQuery,
  LoginResponseBody
} from 'types/src/routers/user/login';
import { useDatabase } from '@/utils/database';
import { createUserToken, createHash } from '@/utils/secure';
import { useConfig } from '@/utils/config';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';

/**
 * @description: 登录接口
 */
export default defineRoute({
  method: 'post',
  options: { authorization: false },
  handler: async (
    req: RouteRequest<LoginRequestBody, LoginRequestQuery, void>,
    res: RouteResponse<LoginResponseBody>
  ) => {
    const { body } = req;

    if (!body.account || !body.password) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '账号或密码不能为空' }));
      return;
    }

    const userRow = selectUser({ account: body.account, password: createHash(body.password) });
    if (!userRow) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '账号或密码错误' }));
      return;
    } else if (userRow.status !== 'enable') {
      res.json(defineResponseBody({ code: responseCode.error, msg: '账号状态异常，无法登录' }));
      return;
    }

    const roleRow = selectRole({ code: userRow.role_code });
    const timeKey = useConfig()[body.temporary ? 'tempTokenExpirationTime' : 'tokenExpirationTime'];
    const token = createUserToken({ account: userRow.account }, { expiresIn: timeKey }); // 生成token
    insertLoginRecord({
      account: userRow.account,
      token: token,
      token_created_time: Date.now() / 1000,
      token_expires_time: Date.now() / 1000 + useConfig().tokenExpirationTime
    }); // 插入登录记录

    res.json(
      defineResponseBody({
        data: {
          token,
          user: {
            nickname: userRow.nickname,
            account: userRow.account,
            avatar: userRow.avatar,
            roleCode: roleRow?.code || '',
            roleName: roleRow?.name || ''
          }
        },
        msg: '登录成功'
      })
    );
  }
});

/**
 * @description: 查询用户
 */
function selectUser(
  params: Pick<UsersTable, 'account' | 'password'>
): Pick<UsersTable, 'account' | 'nickname' | 'status' | 'role_code' | 'avatar'> | undefined {
  const sql = `SELECT account, nickname, status, role_code, avatar FROM users WHERE account = $account AND password = $password;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectUser>>(sql).get(params);
}

/**
 * @description: 查询角色
 */
function selectRole(
  params: Pick<RolesTable, 'code'>
): Pick<RolesTable, 'code' | 'name'> | undefined {
  const sql = `SELECT code, name FROM roles WHERE code = $code;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectRole>>(sql).get(params);
}

/**
 * @description: 插入登录记录
 */
function insertLoginRecord(
  params: Pick<LoginRecordsTable, 'account' | 'token'> & {
    token_created_time: number;
    token_expires_time: number;
  }
) {
  const sql = `
    INSERT INTO login_records (account, token, token_created_date, token_expires_date) VALUES (
      $account,
      $token,
      datetime (strftime ('%Y-%m-%d %H:%M:%S', $token_created_time, 'unixepoch'), 'localtime'),
      datetime (strftime ('%Y-%m-%d %H:%M:%S', $token_expires_time, 'unixepoch'), 'localtime')
    );
  `;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
