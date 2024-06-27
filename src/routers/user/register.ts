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
      const { lastInsertRowid } = createUserRootFolder({
        parent_path: '/',
        name: body.account,
        type: 'folder',
        create_account: body.account
      }); // 创建用户根文件夹

      createUser({
        nickname: body.nickname || body.account,
        account: body.account,
        password: createHash(body.password),
        root_folder_id: lastInsertRowid as number
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
function createUserRootFolder(
  params: Pick<DirectorysTable, 'parent_path' | 'name' | 'type' | 'create_account'>
) {
  const sql = `INSERT INTO directorys (parent_path, name, type, create_account) VALUES ($parent_path, $name, $type, $create_account)`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}

/**
 * @description: 创建用户
 */
function createUser(
  params: Pick<UsersTable, 'nickname' | 'account' | 'password' | 'root_folder_id'>
) {
  const sql = `INSERT INTO users (nickname, account, password, root_folder_id) VALUES ( $nickname, $account, $password, $root_folder_id );`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
