import type { DirectorysTable } from 'types/src/utils/database';
import type {
  RemoveFileRequestBody,
  RemoveFileRequestQuery,
  RemoveFileResponseBody
} from 'types/src/routers/fileSystem/removeFile';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { joinPath } from '@/utils/utils';

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

    if (!query.filePath) {
      throw { code: responseCode.error, msg: '缺少参数' };
    }

    if (query.filePath === '/') {
      throw { code: responseCode.error, msg: '根目录无法删除' };
    }

    const pos = query.filePath.lastIndexOf('/');
    const folderPath = query.filePath.slice(0, pos);
    const filename = query.filePath.slice(pos + 1);
    const innerFilePath = joinPath(locals.user.root_path, folderPath);
    const fileRow = selectFile({ path: innerFilePath, name: filename });

    if (!fileRow) {
      throw { code: responseCode.error, msg: '未找到该文件' };
    }

    deleteFile({ id: fileRow.id });

    res.json(defineResponseBody({ msg: '删除成功' }));
  }
});

/**
 * @description: 查询文件
 */
function selectFile(
  params: Pick<DirectorysTable, 'path' | 'name'>
): Pick<DirectorysTable, 'id'> | undefined {
  const sql = `SELECT id FROM directorys WHERE type = 'file' AND path = $path AND name = $name;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFile>>(sql).get(params);
}

/**
 * @description: 删除文件
 */
function deleteFile(params: Pick<DirectorysTable, 'id'>) {
  const sql = `DELETE FROM directorys WHERE type = 'file' AND id = $id;`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
