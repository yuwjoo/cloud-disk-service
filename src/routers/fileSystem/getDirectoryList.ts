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

    const rootFolderRow = selectFolderById(locals.user.root_folder_id);
    let parentFolderRow;

    if (query.parentFolderId) {
      parentFolderRow = selectFolderById(query.parentFolderId);
    } else {
      parentFolderRow = rootFolderRow;
    }

    if (!rootFolderRow || !parentFolderRow) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '文件夹不存在' }));
      return;
    }

    const rootFolderPath = mergePath(rootFolderRow.parent_path, rootFolderRow.name);
    const parentFolderPath = mergePath(parentFolderRow.parent_path, parentFolderRow.name);

    if (!parentFolderPath.startsWith(rootFolderPath)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '无权限访问' }));
      return;
    }

    const folderPathList = selectFolderPathList(rootFolderPath, parentFolderPath);

    const directoryRows = selectDirectorys({ parent_path: parentFolderPath });

    let folderList: Required<GetDirectoryListResponseBody>['data']['directoryList'] = [];
    let fileList: Required<GetDirectoryListResponseBody>['data']['directoryList'] = [];

    directoryRows.forEach((directory) => {
      const temp = {
        id: directory.id,
        name: directory.name,
        size: directory.size,
        type: directory.type,
        mimeType: directory.mime_type,
        parentFolderId: parentFolderRow.id,
        createTime: new Date(directory.create_date).getTime(),
        modifiedTime: new Date(directory.modified_date).getTime()
      };
      directory.type === 'folder' ? folderList.push(temp) : fileList.push(temp);
    });

    res.json(
      defineResponseBody({
        data: {
          folderPathList,
          directoryList: folderList.concat(fileList)
        }
      })
    );
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
 * @description: 查询文件夹路径列表
 */
function selectFolderPathList(
  rootPath: string,
  folderPath: string
): Required<GetDirectoryListResponseBody>['data']['folderPathList'] {
  let sqlWhereParams = [];
  let sqlWhereTexts = [];
  let whileCount = 0;

  do {
    const pos = folderPath.lastIndexOf('/');
    const parentPath = folderPath.slice(0, pos);
    const folderName = folderPath.slice(pos + 1);
    sqlWhereParams.push(parentPath || '/', folderName || '/');
    sqlWhereTexts.push(`(parent_path = ? AND name = ?)`);
    folderPath = parentPath;
    if (++whileCount > 500) throw new Error('查询文件夹路径循环体异常, folderPath: ' + folderPath);
  } while (folderPath && folderPath.startsWith(rootPath));

  const sql = `
    SELECT
      id, parent_path, name
    FROM
      directorys
    WHERE
      type = 'folder' AND ${sqlWhereTexts.join(' OR ')}
  `;
  const folderRows = useDatabase()
    .prepare<string[], Pick<DirectorysTable, 'id' | 'parent_path' | 'name'>>(sql)
    .all(...sqlWhereParams);

  return (folderRows || []).map((row, index) => ({
    folderId: row.id,
    folderName: index === 0 ? '/' : mergePath(row.parent_path, row.name)
  }));
}

/**
 * @description: 查询目录列表
 */
function selectDirectorys(params: Pick<DirectorysTable, 'parent_path'>) {
  type SQLResult = Pick<
    DirectorysTable,
    'id' | 'name' | 'size' | 'type' | 'mime_type' | 'create_date' | 'modified_date'
  >;

  const sql = `SELECT id, name, size, type, mime_type, create_date, modified_date FROM directorys WHERE parent_path = $parent_path ORDER BY name ASC;`;
  return useDatabase().prepare<typeof params, SQLResult>(sql).all(params);
}
