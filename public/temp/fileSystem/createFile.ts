import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { FoldersTable } from 'types/src/utils/database';
import type {
  CreateFileRequestBody,
  CreateFileResponseData
} from 'types/src/routers/fileSystem/createFile';
import { useDatabase } from '@/utils/database';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { randomUUID } from 'crypto';

export default defineRoute({
  method: 'post',
  handler: createFile
});

/**
 * @description: 创建文件接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function createFile(
  req: RouteRequest<CreateFileRequestBody>,
  res: RouteResponse<CreateFileResponseData>
) {
  const { body } = req;
  let folderUUID = body.folderUUID;
  console.log(body);

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

  useDatabase().transaction(() => {
    const insertInfo = useDatabase()
      .prepare<{
        name: string;
        size: number;
        type: string;
        oss_path: string;
        hash: string;
        create_account: string;
      }>(
        `INSERT INTO resources
          (name, size, type, oss_path, hash, create_account)
         VALUES
          ($name, $size, $type, $oss_path, $hash, $create_account)`
      )
      .run({
        name: body.name,
        size: body.size,
        type: body.type,
        oss_path: body.ossPath,
        hash: body.hash,
        create_account: res.locals.user.account
      }); // 插入资源数据

    useDatabase()
      .prepare<{
        uuid: string;
        name: string;
        size: number;
        type: string;
        resources_id: number;
        owner_folder_uuid: string;
        owner_account: string;
      }>(
        `INSERT INTO files
          (uuid, name, size, type, resources_id, owner_folder_uuid, owner_account)
         VALUES
          ($uuid, $name, $size, $type, $resources_id, $owner_folder_uuid, $owner_account)`
      )
      .run({
        uuid: randomUUID(),
        name: body.name,
        size: body.size,
        type: body.type,
        resources_id: insertInfo.lastInsertRowid as number,
        owner_folder_uuid: folderUUID,
        owner_account: res.locals.user.account
      }); // 插入文件数据
  })();

  res.json(defineResponseBody({ msg: '创建成功' }));
}
