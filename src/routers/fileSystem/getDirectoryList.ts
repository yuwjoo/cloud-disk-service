import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { DirectorysTable } from 'types/src/utils/database';
import type {
  GetDirectoryListRequestQuery,
  GetDirectoryListResponseData
} from 'types/src/routers/fileSystem/getDirectoryList';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';

export default defineRoute({
  method: 'get',
  handler: getDirectoryList
});

/**
 * @description: 获取目录列表接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function getDirectoryList(
  req: RouteRequest<any, GetDirectoryListRequestQuery>,
  res: RouteResponse<GetDirectoryListResponseData>
) {
  const folderId = req.query.folderId || res.locals.user.root_directory_id;
  const folder = useDatabase()
    .prepare<DirectorysTable['id'], Pick<DirectorysTable, 'create_account'>>(
      `SELECT create_account FROM directorys WHERE id = ?`
    )
    .get(folderId); // 查询文件夹

  if (!folder || folder.create_account !== res.locals.user.account) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '无法访问该文件夹' }));
    return;
  }

  const directorys = useDatabase()
    .prepare<
      Pick<DirectorysTable, 'parent_id'>,
      Pick<DirectorysTable, 'id' | 'name' | 'size' | 'type' | 'create_date' | 'modified_date'>
    >(
      `SELECT
        id,
        name,
        size,
        type,
        create_date,
        modified_date
      FROM
        directorys
      WHERE
        parent_id = $parent_id
      ORDER BY name ASC`
    )
    .all({ parent_id: folderId });

  let folderList: GetDirectoryListResponseData['list'] = [];
  let fileList: GetDirectoryListResponseData['list'] = [];

  directorys.forEach((directory) => {
    const data = {
      ...directory,
      createTime: new Date(directory.create_date).getTime(),
      modifiedTime: new Date(directory.modified_date).getTime()
    };
    directory.type === 'folder' ? folderList.push(data) : fileList.push(data);
  });

  res.json(defineResponseBody({ data: { folderId, list: folderList.concat(fileList) } }));
}
