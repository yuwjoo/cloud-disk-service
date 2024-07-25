import type { DirectorysTable } from 'types/src/utils/database';
import type {
  GetDirectoryListRequestBody,
  GetDirectoryListRequestQuery,
  GetDirectoryListResponseBody
} from 'types/src/routers/fileSystem/getDirectoryList';
import { defineResponseBody, defineRoute } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { joinPath } from '@/utils/utils';
import { generateCoverUrl } from '@/utils/file';

/**
 * @description: 获取目录列表接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<GetDirectoryListRequestBody, GetDirectoryListRequestQuery>,
    res: RouteResponse<GetDirectoryListResponseBody>
  ) => {
    const { query, locals } = req;
    const folderPath = query.folderPath || '/';
    const innerFolderPath = joinPath(locals.user.root_path, folderPath);
    const directoryRows = selectDirectorys({ path: innerFolderPath });
    const list = directoryRows.map((directory) => ({
      fullPath: joinPath(folderPath, directory.name),
      name: directory.name,
      size: directory.size,
      type: directory.type,
      cover: generateCoverUrl(directory.cover),
      createTime: new Date(directory.create_date).getTime(),
      modifiedTime: new Date(directory.modified_date).getTime()
    }));

    res.json(defineResponseBody({ data: { folderPath, list } }));
  }
});

/**
 * @description: 查询目录列表
 */
function selectDirectorys(
  params: Pick<DirectorysTable, 'path'>
): Pick<DirectorysTable, 'name' | 'size' | 'type' | 'cover' | 'create_date' | 'modified_date'>[] {
  const sql = `SELECT name, size, type, cover, create_date, modified_date FROM directorys WHERE path = $path ORDER BY type DESC, name ASC;`;
  return useDatabase().prepare<typeof params>(sql).all(params) as any;
}
