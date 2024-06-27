import type { DirectorysTable } from 'types/src/utils/database';
import type {
  RemoveFileRequestBody,
  RemoveFileRequestQuery,
  RemoveFileResponseBody
} from 'types/src/routers/fileSystem/removeFile';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';

/**
 * @description: 删除文件接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<RemoveFileRequestBody, RemoveFileRequestQuery>,
    res: RouteResponse<RemoveFileResponseBody>
  ) => {
    const { query, locals } = req;

    if (!query.fileId) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '缺少文件id' }));
      return;
    }

    const rootFolderRow = selectFolderById(locals.user.root_folder_id);

    const fileRow = selectFile({ id: query.fileId });

    if (!rootFolderRow || !fileRow || !fileRow.parent_path.startsWith(rootFolderRow.parent_path)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '无权限访问' }));
      return;
    }

    deleteFile({ id: query.fileId });

    res.json(defineResponseBody({ msg: '删除成功' }));
  }
});

/**
 * @description: 根据id查询文件夹
 */
function selectFolderById(
  params: DirectorysTable['id']
): Pick<DirectorysTable, 'id' | 'parent_path' | 'name'> | undefined {
  const sql = `SELECT id, parent_path, name FROM directorys WHERE type = 'folder' AND id = ?;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFolderById>>(sql).get(params);
}

/**
 * @description: 查询文件
 */
function selectFile(
  params: Pick<DirectorysTable, 'id'>
): Pick<DirectorysTable, 'parent_path'> | undefined {
  const sql = `SELECT parent_path FROM directorys WHERE type = 'file' AND id = $id;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFile>>(sql).get(params);
}

/**
 * @description: 删除文件
 */
function deleteFile(params: Pick<DirectorysTable, 'id'>) {
  const sql = `DELETE FROM directorys WHERE type = 'file' AND id = $id;`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
