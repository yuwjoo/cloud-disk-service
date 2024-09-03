import type {
  DeleteFilesRequestBody,
  DeleteFilesRequestQuery,
  DeleteFilesResponseBody
} from 'types/src/routers/fileSystem/deleteFiles';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { joinPath } from '@/utils/utils';
import type { DirectorysTable } from 'types/src/utils/database';

/**
 * @description: 删除文件接口
 */
export default defineRoute({
  method: 'post',
  handler: async (
    req: RouteRequest<DeleteFilesRequestBody, DeleteFilesRequestQuery>,
    res: RouteResponse<DeleteFilesResponseBody>
  ) => {
    const { body, locals } = req;

    if (!body.filePaths) {
      throw { code: responseCode.error, msg: '缺少参数' };
    }

    const sqlWheres: string[] = [];

    body.filePaths.forEach((filePath: string) => {
      if (filePath === '/') return; // 根目录无法删除

      const pos = filePath.lastIndexOf('/');
      const folderPath = filePath.slice(0, pos);
      const filename = filePath.slice(pos + 1);
      const innerFilePath = joinPath(locals.user.root_path, folderPath);

      sqlWheres.push(`(path = '${innerFilePath}' AND name = '${filename}')`);
    });

    useDatabase().transaction(() => {
      const directorys = selectDirectorys(`(${sqlWheres.join(' OR ')})`);
      const files = directorys.filter((d) => d.type === 'file');
      const folder = directorys.filter((d) => d.type === 'folder');
      deleteDirectorys(directorys.map((row) => `id = '${row.id}'`).join(' OR '));
      if (files.length) {
        updateResource(files.map((row) => `id = '${row.resources_id}'`).join(' OR '));
      }
      if (folder.length) {
        deleteDirectorys(folder.map((row) => `path like '${row.path}/${row.name}%'`).join(' OR '));
      }
    })();

    res.json(defineResponseBody({ msg: '删除成功' }));
  }
});

/**
 * @description: 查询目录
 */
function selectDirectorys(
  where: string
): Pick<DirectorysTable, 'resources_id' | 'type' | 'path' | 'name' | 'id'>[] {
  const sql = `SELECT resources_id, type, path, name, id FROM directorys WHERE ${where};`;
  return useDatabase().prepare(sql).all() as any;
}

/**
 * @description: 删除目录
 */
function deleteDirectorys(where: string) {
  const sql = `DELETE FROM directorys WHERE ${where};`;
  return useDatabase().prepare(sql).run();
}

/**
 * @description: 更新资源引用
 */
function updateResource(where: string) {
  const sql = `
      UPDATE resources 
      SET 
        reference_count = reference_count - 1,
        modified_date = datetime (CURRENT_TIMESTAMP, 'localtime')
      WHERE ${where};
    `;
  useDatabase().prepare(sql).run();
}
