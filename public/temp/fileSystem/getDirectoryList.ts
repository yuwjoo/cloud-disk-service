import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { FilesTable, FoldersTable } from 'types/src/utils/database';
import type {
  GetDirectoryListRequestQuery,
  GetDirectoryListResponseData
} from 'types/src/routers/fileSystem/getDirectoryList';
import { useDatabase } from '@/utils/database';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';

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
  const { query } = req;

  let folderUUID = query.folderUUID;

  if (!folderUUID) {
    const rootFolder = useDatabase()
      .prepare<unknown[], Pick<FoldersTable, 'uuid' | 'owner_account'>>(
        `SELECT uuid, owner_account FROM folders WHERE owner_folder_uuid IS NULL`
      )
      .get()!; // 获取root文件夹

    if (res.locals.user.account !== rootFolder.owner_account) {
      folderUUID = useDatabase()
        .prepare<{ owner_folder_uuid: string; owner_account: string }, Pick<FoldersTable, 'uuid'>>(
          `SELECT uuid FROM folders WHERE owner_folder_uuid = $owner_folder_uuid AND owner_account = $owner_account`
        )
        .get({ owner_folder_uuid: rootFolder.uuid, owner_account: res.locals.user.account })!.uuid;
    } else {
      folderUUID = rootFolder.uuid;
    }
  } else {
    const parentFolder = useDatabase()
      .prepare<string, Pick<FoldersTable, 'owner_account'>>(
        `SELECT owner_account FROM folders WHERE uuid = $uuid`
      )
      .get(folderUUID);
    if (res.locals.user.account !== parentFolder?.owner_account) {
      // 无权限访问
      res.json(defineResponseBody({ code: responseCode.error, msg: '无权限访问该文件夹' }));
      return;
    }
  }

  const folderPath = buildFolderPath(folderUUID, res.locals.user.account); // 获取文件路径

  const folderList = useDatabase()
    .prepare<
      string,
      Pick<FoldersTable, 'uuid' | 'name' | 'size'> & {
        modifiedTime: number;
        createTime: number;
        type: 'folder';
      }
    >(
      `SELECT
        uuid,
        name,
        size,
        strftime ('%s', modified_date) AS modifiedTime,
        strftime ('%s', create_date) AS createTime,
        'folder' AS type
       FROM
        folders
       WHERE
        owner_folder_uuid = $owner_folder_uuid
       ORDER BY name ASC`
    )
    .all(folderUUID); // 查询文件夹列表

  const fileList = useDatabase()
    .prepare<
      string,
      Pick<FilesTable, 'uuid' | 'name' | 'size' | 'type'> & {
        modifiedTime: number;
        createTime: number;
        type: 'file';
      }
    >(
      `SELECT
        uuid,
        name,
        size,
        strftime ('%s', modified_date) AS modifiedTime,
        strftime ('%s', create_date) AS createTime,
        type
       FROM
        files
       WHERE
        owner_folder_uuid = $owner_folder_uuid
       ORDER BY name ASC`
    )
    .all(folderUUID); // 查询文件列表

  res.json(defineResponseBody({ data: { folderPath, list: [...folderList, ...fileList] } }));
}

/**
 * @description: 递归构建文件路径
 * @return {GetDirectoryListResponseData['folderPath']} 文件路径
 */
function buildFolderPath(
  folderUUID: string,
  userAccount: string
): GetDirectoryListResponseData['folderPath'] {
  const folderPath: GetDirectoryListResponseData['folderPath'] = [];
  let currentUUID: string | null = folderUUID;

  while (currentUUID) {
    const folder = useDatabase()
      .prepare<string, Pick<FoldersTable, 'uuid' | 'name' | 'owner_folder_uuid' | 'owner_account'>>(
        `SELECT uuid, name, owner_folder_uuid, owner_account FROM folders WHERE uuid = ?`
      )
      .get(currentUUID);

    if (!folder || folder.owner_account !== userAccount) {
      break;
    }

    folderPath.unshift({ uuid: folder.uuid, name: folder.name });
    currentUUID = folder.owner_folder_uuid;
  }

  return folderPath;
}
