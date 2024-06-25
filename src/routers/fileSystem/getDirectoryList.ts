import type { DirectorysTable } from 'types/src/utils/database';
import type {
  GetDirectoryListRequestBody,
  GetDirectoryListRequestQuery,
  GetDirectoryListResponseBody
} from 'types/src/routers/fileSystem/getDirectoryList';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';

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

    let folderPath = query.folderPath;

    if (!folderPath || folderPath === '/') {
      folderPath = locals.user.root_folder_path;
    }

    if (!folderPath.startsWith(locals.user.root_folder_path)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '无权限访问' }));
      return;
    }

    const directoryRows = selectDirectorys({ folder_path: folderPath });

    let folderList: Required<GetDirectoryListResponseBody>['data']['list'] = [];
    let fileList: Required<GetDirectoryListResponseBody>['data']['list'] = [];

    directoryRows.forEach((directory) => {
      const temp = {
        id: directory.id,
        name: directory.name,
        size: directory.size,
        type: directory.type,
        mimeType: directory.mime_type,
        createTime: new Date(directory.create_date).getTime(),
        modifiedTime: new Date(directory.modified_date).getTime()
      };
      directory.type === 'folder' ? folderList.push(temp) : fileList.push(temp);
    });

    res.json(defineResponseBody({ data: { folderPath, list: folderList.concat(fileList) } }));
  }
});

/**
 * @description: 查询目录列表
 */
function selectDirectorys(params: Pick<DirectorysTable, 'folder_path'>) {
  type SQLResult = Pick<
    DirectorysTable,
    'id' | 'name' | 'size' | 'type' | 'mime_type' | 'create_date' | 'modified_date'
  >;

  const sql = `SELECT id, name, size, type, mime_type, create_date, modified_date FROM directorys WHERE folder_path = $folder_path ORDER BY name ASC;`;
  return useDatabase().prepare<typeof params, SQLResult>(sql).all(params);
}
