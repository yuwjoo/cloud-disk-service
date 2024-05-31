import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { LoginRecordsTable, RolesTable, UsersTable } from 'types/src/utils/database';
import type { LoginRequestBody, LoginResponseData } from 'types/src/routers/user/login';
import { useDatabase } from '@/utils/database';
import { createUserToken, createHash } from '@/utils/secure';
import { useConfig } from '@/utils/config';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';

export default defineRoute({
  method: 'post',
  handler: login,
  options: { authorization: false }
});

/**
 * @description: 登录接口
 * @param {RouteRequest<LoginRequestBody>} req 请求
 * @param {RouteResponse<LoginResponseData>} res 响应
 */
async function login(req: RouteRequest<LoginRequestBody>, res: RouteResponse<LoginResponseData>) {
  const { body } = req;

  if (!body || !body.account || !body.password) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '账号或密码不能为空' }));
    return;
  }

  const userData = useDatabase()
    .prepare<
      Pick<UsersTable, 'account' | 'password'>,
      Pick<UsersTable, 'account' | 'nickname' | 'status' | 'role_code' | 'avatar'>
    >(
      `SELECT account, nickname, status, role_code, avatar FROM users WHERE account = $account AND password = $password;`
    )
    .get({ account: body.account, password: createHash(body.password) }); // 查询用户

  if (!userData) {
    // 未找到符合条件的用户
    res.json(defineResponseBody({ code: responseCode.error, msg: '账号或密码错误' }));
    return;
  }

  if (userData.status !== 'active') {
    // 账号状态异常
    res.json(defineResponseBody({ code: responseCode.error, msg: '账号状态异常，无法登录' }));
    return;
  }

  const token = createUserToken(
    { account: userData.account },
    { expiresIn: useConfig()[body.temporary ? 'tempTokenExpirationTime' : 'tokenExpirationTime'] }
  ); // 生成token

  const roleData = useDatabase()
    .prepare<Pick<RolesTable, 'code'>, Pick<RolesTable, 'code' | 'name'>>(
      `SELECT code, name FROM roles WHERE code = $code;`
    )
    .get({ code: userData.role_code }); // 获取角色信息

  useDatabase()
    .prepare<
      Pick<LoginRecordsTable, 'account' | 'token'> & {
        token_created_time: number;
        token_expires_time: number;
      }
    >(
      `INSERT INTO login_records (account, token, token_created_date, token_expires_date) VALUES (
        $account,
        $token,
        datetime (strftime ('%Y-%m-%d %H:%M:%S', $token_created_time, 'unixepoch'), 'localtime'),
        datetime (strftime ('%Y-%m-%d %H:%M:%S', $token_expires_time, 'unixepoch'), 'localtime')
      );`
    )
    .run({
      account: userData.account,
      token: token,
      token_created_time: Date.now() / 1000,
      token_expires_time: Date.now() / 1000 + useConfig().tokenExpirationTime
    }); // 插入登录记录

  const responseUserData = {
    nickname: userData.nickname,
    account: userData.account,
    avatar: userData.avatar,
    roleCode: roleData?.code || '',
    roleName: roleData?.name || ''
  };

  res.json(defineResponseBody({ data: { token, user: responseUserData }, msg: '登录成功' }));
}
