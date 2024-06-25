import type { DirectorysTable } from 'types/src/utils/database';
import type {
  GetDirectoryListRequestBody,
  GetDirectoryListRequestQuery,
  GetDirectoryListResponseBody
} from 'types/src/routers/fileSystem/getDirectoryList';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { mergePath } from '@/utils/utils';

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

    const folderRow = selectFolder({
      id: query.folderId,
      folder_path: locals.user.root_folder_path
    });

    if (!folderRow || !folderRow.folder_path?.startsWith(locals.user.root_folder_path)) {
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
        parentFolderPath: folderPath,
        createTime: new Date(directory.create_date).getTime(),
        modifiedTime: new Date(directory.modified_date).getTime()
      };
      directory.type === 'folder' ? folderList.push(temp) : fileList.push(temp);
    });

    res.json(
      defineResponseBody({
        data: { parentFolderPath: folderPath, list: folderList.concat(fileList) }
      })
    );
  }
});

/**
 * @description: 根据id查询文件夹
 */
function selectFolderById(params: DirectorysTable['id']): string {
  type SQLResult = Pick<DirectorysTable, 'folder_path' | 'name'>;

  const sql = `SELECT folder_path, name FROM directorys WHERE type = 'folder' AND id = $id;`;
  const folderRow = useDatabase().prepare<typeof params, SQLResult>(sql).get(params);
  return folderRow ? mergePath(folderRow.folder_path || '', folderRow.name) : '';
}

/**
 * @description: 根据路径查询文件夹
 */
function selectFolderByPath(params: Partial<Pick<DirectorysTable, 'id'> & { path: string }>) {
  type SQLResult = Pick<DirectorysTable, 'folder_path'>;

  if (params.id) {
    const sql = `SELECT folder_path FROM directorys WHERE type = 'folder' AND id = $id;`;
    return useDatabase().prepare<typeof params, SQLResult>(sql).get({ id: params.id });
  } else {
    const sql = `SELECT folder_path FROM directorys WHERE type = 'folder' AND folder_path = $folder_path AND name = $name;`;
    return useDatabase().prepare<typeof params, SQLResult>(sql).get({ id: params.id });
  }
}

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
