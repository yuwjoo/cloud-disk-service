import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { FilesTable, FoldersTable } from 'types/src/utils/database';
import type {
  CreateFileRequestQuery,
  CreateFileResponseData
} from 'types/src/routers/fileSystem/createFile';
import { useDatabase } from '@/utils/database';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { createHash } from '@/utils/secure';

export default defineRoute({
  method: 'get',
  handler: createFile
});

/**
 * @description: 创建文件接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function createFile(
  req: RouteRequest<any, CreateFileRequestQuery>,
  res: RouteResponse<CreateFileResponseData>
) {
  const { query } = req;

  const folderData = useDatabase()
    .prepare<FoldersTable['id'], Pick<FoldersTable, 'owner_account'>>(
      `SELECT owner_account FROM folders WHERE id = ?;`
    )
    .get(query.folderId);

  if (!folderData) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '创建失败，上级文件夹不存在' }));
    return;
  } else if (folderData.owner_account !== res.locals.user.account) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '创建失败，无权限操作' }));
    return;
  }

  const duplicateFile = useDatabase()
    .prepare<Pick<FilesTable, 'name' | 'owner_folder_id'>, Pick<FilesTable, 'id'>>(
      `SELECT id FROM files WHERE name = $name AND owner_folder_id = $owner_folder_id;`
    )
    .get({ name: query.name, owner_folder_id: query.folderId }); // 查询重复名称文件

  if (duplicateFile) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '创建失败，名称重复' }));
    return;
  }

  useDatabase()
    .prepare<
      Pick<FilesTable, 'id' | 'name' | 'size' | 'oss_path' | 'owner_folder_id' | 'owner_account'>
    >(
      `INSERT INTO files (id, name, size, oss_path, owner_folder_id, owner_account) VALUES ($id, $name, $size, $oss_path, $owner_folder_id, $owner_account);`
    )
    .run({
      id: `${query.folderId}-${createHash(query.name + query.ossPath + res.locals.user.account)}`,
      name: query.name,
      size: query.size,
      oss_path: query.ossPath,
      owner_folder_id: query.folderId,
      owner_account: res.locals.user.account
    }); // 插入文件数据

  res.json(defineResponseBody({ msg: '创建成功' }));
}
