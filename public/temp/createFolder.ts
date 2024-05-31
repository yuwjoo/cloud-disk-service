import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { FoldersTable } from 'types/src/utils/database';
import type {
  CreateFolderRequestQuery,
  CreateFolderResponseData
} from 'types/src/routers/fileSystem/createFolder';
import { useDatabase } from '@/utils/database';
import { defineRoute, defineResponseBody, responseCode } from '@/utils/router';

export default defineRoute({
  method: 'get',
  handler: createFolder
});

/**
 * @description: 创建文件夹接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function createFolder(
  req: RouteRequest<any, CreateFolderRequestQuery>,
  res: RouteResponse<CreateFolderResponseData>
) {
  const { query } = req;

  if (!query || !query.parentId || !query.name) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '缺少参数' }));
    return;
  }

  const folderData = useDatabase()
    .prepare<FoldersTable['id'], Pick<FoldersTable, 'owner_account'>>(
      `SELECT owner_account FROM folders WHERE id = ?;`
    )
    .get(query.parentId);

  if (!folderData) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '创建失败，上级文件夹不存在' }));
    return;
  } else if (folderData.owner_account !== res.locals.user.account) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '创建失败，无权限操作' }));
    return;
  }

  const duplicateDirectory = useDatabase()
    .prepare<Pick<FoldersTable, 'name' | 'owner_folder_id'>, Pick<FoldersTable, 'id'>>(
      `SELECT id FROM folders WHERE name = $name AND owner_folder_id = $owner_folder_id;`
    )
    .get({ name: query.name, owner_folder_id: query.parentId }); // 查询重复名称目录

  if (duplicateDirectory) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '创建失败，名称重复' }));
    return;
  }

  useDatabase()
    .prepare<Pick<FoldersTable, 'id' | 'name' | 'owner_folder_id' | 'owner_account'>>(
      `INSERT INTO folders (id, name, owner_folder_id, owner_account) VALUES ($id, $name, $owner_folder_id, $owner_account);`
    )
    .run({
      id: `${query.parentId}-${query.name}`,
      name: query.name,
      owner_folder_id: query.parentId,
      owner_account: res.locals.user.account
    }); // 插入目录数据

  res.json(defineResponseBody({ msg: '创建成功' }));
}
