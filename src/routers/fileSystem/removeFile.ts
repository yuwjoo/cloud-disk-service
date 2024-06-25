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

    const fileRow = selectFile({ id: query.fileId });

    if (!fileRow || !fileRow.folder_path?.startsWith(locals.user.root_folder_path)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '无权限访问' }));
      return;
    }

    deleteFile({ id: query.fileId });

    res.json(defineResponseBody({ msg: '删除成功' }));
  }
});

/**
 * @description: 查询文件
 */
function selectFile(
  params: Pick<DirectorysTable, 'id'>
): Pick<DirectorysTable, 'folder_path'> | undefined {
  const sql = `SELECT folder_path FROM directorys WHERE type = 'file' AND id = $id;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFile>>(sql).get(params);
}

/**
 * @description: 删除文件
 */
function deleteFile(params: Pick<DirectorysTable, 'id'>) {
  const sql = `DELETE FROM directorys WHERE type = 'file' AND id = $id;`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
