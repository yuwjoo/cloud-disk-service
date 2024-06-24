import type { DirectorysTable, UsersTable } from 'types/src/utils/database';
import type {
  RegisterRequestBody,
  RegisterRequestQuery,
  RegisterResponseBody
} from 'types/src/routers/user/register';
import { useDatabase } from '@/utils/database';
import { createHash } from '@/utils/secure';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';

export default defineRoute({
  method: 'post',
  handler: register,
  options: { authorization: false }
});

/**
 * @description: 注册接口
 * @param {RouteRequest} req 请求
 * @param {RouteResponse} res 响应
 */
async function register(
  req: RouteRequest<RegisterRequestBody, RegisterRequestQuery>,
  res: RouteResponse<RegisterResponseBody>
) {
  const { body } = req;

  if (!body || !body.account || !body.password) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '账号或密码不能为空' }));
    return;
  }

  const userData = useDatabase()
    .prepare<Pick<UsersTable, 'account'>, Pick<UsersTable, 'account'>>(
      `SELECT account FROM users WHERE account = $account;`
    )
    .get({ account: body.account }); // 查询用户

  if (userData) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '该账号已注册' }));
    return;
  }

  useDatabase().transaction(() => {
    const { lastInsertRowid } = useDatabase()
      .prepare<Pick<DirectorysTable, 'name' | 'type' | 'parent_id' | 'create_account'>>(
        'INSERT INTO directorys (name, type, parent_id, create_account) VALUES ($name, $type, $parent_id, $create_account)'
      )
      .run({
        name: body.account,
        type: 'folder',
        parent_id: 1,
        create_account: body.account
      }); // 插入用户根文件夹
    useDatabase()
      .prepare<Pick<UsersTable, 'nickname' | 'account' | 'password' | 'root_directory_id'>>(
        `INSERT INTO users (nickname, account, password, root_directory_id) VALUES ( $nickname, $account, $password, $root_directory_id );`
      )
      .run({
        nickname: body.nickname || `用户${Math.floor(Math.random() * 10000)}`,
        account: body.account,
        password: createHash(body.password),
        root_directory_id: lastInsertRowid as number
      }); // 插入用户数据
  })();

  res.json(defineResponseBody({ msg: '注册成功' }));
}
