import type { DirectorysTable, UsersTable } from 'types/src/utils/database';
import type {
  RegisterRequestBody,
  RegisterRequestQuery,
  RegisterResponseBody
} from 'types/src/routers/user/register';
import { useDatabase } from '@/utils/database';
import { createHash } from '@/utils/secure';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { testFilename } from '@/utils/rules';
import { joinPath } from '@/utils/utils';

/**
 * @description: 注册接口
 */
export default defineRoute({
  method: 'post',
  options: { authorization: false },
  handler: async (
    req: RouteRequest<RegisterRequestBody, RegisterRequestQuery, void>,
    res: RouteResponse<RegisterResponseBody>
  ) => {
    const { body } = req;

    if (!body.account || !body.password) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '账号或密码不能为空' }));
      return;
    }

    if (!testFilename(body.account)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '非法账号名' }));
      return;
    }

    const userRow = selectUser({ account: body.account });

    if (userRow) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '该账号已注册' }));
      return;
    }

    useDatabase().transaction(() => {
      createUserRootFolder({
        path: '/',
        name: body.account,
        type: 'folder',
        cover: '/static/cover/folder'
      }); // 创建用户根文件夹

      createUser({
        nickname: body.nickname || body.account,
        account: body.account,
        password: createHash(body.password),
        root_path: joinPath('/', body.account)
      }); // 创建用户
    })();

    res.json(defineResponseBody({ msg: '注册成功' }));
  }
});

/**
 * @description: 查询用户
 */
function selectUser(params: Pick<UsersTable, 'account'>): Pick<UsersTable, 'account'> | undefined {
  const sql = `SELECT account FROM users WHERE account = $account;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectUser>>(sql).get(params);
}

/**
 * @description: 创建用户根文件夹
 */
function createUserRootFolder(params: Pick<DirectorysTable, 'path' | 'name' | 'type' | 'cover'>) {
  const sql = `INSERT INTO directorys (path, name, type, cover) VALUES ($path, $name, $type, $cover)`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}

/**
 * @description: 创建用户
 */
function createUser(params: Pick<UsersTable, 'nickname' | 'account' | 'password' | 'root_path'>) {
  const sql = `INSERT INTO users (nickname, account, password, root_path) VALUES ( $nickname, $account, $password, $root_path );`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
