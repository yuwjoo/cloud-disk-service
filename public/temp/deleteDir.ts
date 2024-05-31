import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { FoldersTable } from 'types/src/utils/database';
import type {
  DeleteDirRequestQuery,
  DeleteDirResponseData
} from 'types/src/routers/fileSystem/deleteDir';
import { useDatabase } from '@/utils/database';
import { defineRoute, defineResponseBody, responseCode } from '@/utils/router';

export default defineRoute({
  method: 'get',
  handler: deleteDir
});

/**
 * @description: 删除文件夹接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function deleteDir(
  req: RouteRequest<any, DeleteDirRequestQuery>,
  res: RouteResponse<DeleteDirResponseData>
) {
  const params = req.query;

  const folderData = useDatabase()
    .prepare<FoldersTable['id'], Pick<FoldersTable, 'owner_account'>>(
      `SELECT owner_account FROM folders WHERE id = ?;`
    )
    .get(params.folderId); // 查询当前id对应文件夹

  if (!folderData) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '删除失败，文件夹不存在' }));
    return;
  } else if (folderData.owner_account !== res.locals.user.account) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '删除失败，无权限操作' }));
    return;
  }

  useDatabase()
    .prepare<FoldersTable['id']>(`DELETE FROM directories WHERE id = ?`)
    .run(params.folderId); // 删除指定id文件夹

  res.json(defineResponseBody({ msg: '删除成功' }));
}
