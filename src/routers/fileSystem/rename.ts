import type {
  RenameRequestBody,
  RenameRequestQuery,
  RenameResponseBody
} from 'types/src/routers/fileSystem/rename';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { joinPath } from '@/utils/utils';
import { testFilename } from '@/utils/rules';

/**
 * @description: 重命名接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<RenameRequestBody, RenameRequestQuery>,
    res: RouteResponse<RenameResponseBody>
  ) => {
    const { query, locals } = req;

    if (!query.filePath || !query.newName) {
      throw { code: responseCode.error, msg: '缺少参数' };
    }

    if (query.filePath === '/') {
      throw { code: responseCode.error, msg: '根目录无法重命名' };
    }

    if (!testFilename(query.newName)) {
      throw { code: responseCode.error, msg: '非法文件名' };
    }

    const pos = query.filePath.lastIndexOf('/');
    const folderPath = query.filePath.slice(0, pos);
    const filename = query.filePath.slice(pos + 1);
    const innerFilePath = joinPath(locals.user.root_path, folderPath);

    renameDirectory({ path: innerFilePath, oldName: filename, newName: query.newName });

    res.json(defineResponseBody({ msg: '重命名成功' }));
  }
});

/**
 * @description: 重命名目录
 */
function renameDirectory(params: { path: string; oldName: string; newName: string }) {
  const sql = `
        UPDATE directorys 
        SET 
          name = $newName,
          modified_date = datetime (CURRENT_TIMESTAMP, 'localtime')
        WHERE path = $path AND name = $oldName;
      `;
  const sql2 = `
      UPDATE directorys 
      SET 
        path = replace(path, $oldPath, $newPath),
        modified_date = datetime (CURRENT_TIMESTAMP, 'localtime')
      WHERE path like $whilePath;
    `;
  useDatabase().transaction(() => {
    useDatabase().prepare<typeof params>(sql).run(params);
    useDatabase()
      .prepare(sql2)
      .run({
        whilePath: `${params.path}/${params.oldName}%`,
        oldPath: `${params.path}/${params.oldName}`,
        newPath: `${params.path}/${params.newName}`
      });
  })();
}
