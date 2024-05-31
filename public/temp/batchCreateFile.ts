import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { FilesTable, FoldersTable } from 'types/src/utils/database';
import type {
  BatchCreateFileRequestBody,
  BatchCreateFileResponseData
} from 'types/src/routers/fileSystem/batchCreateFile';
import { useDatabase } from '@/utils/database';
import { defineRoute, defineResponseBody, responseCode } from '@/utils/router';
import { createHash } from '@/utils/secure';

export default defineRoute({
  method: 'post',
  handler: batchCreateFile
});

/**
 * @description: 批量创建文件接口
 * @param {RouteRequest<BatchCreateFileRequestBody>} req 请求
 * @param {RouteResponse<BatchCreateFileResponseData>} res 响应
 */
async function batchCreateFile(
  req: RouteRequest<BatchCreateFileRequestBody>,
  res: RouteResponse<BatchCreateFileResponseData>
) {
  const { body } = req;

  if (!body || !body.folderId) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '缺少参数' }));
    return;
  }

  const folderData = useDatabase()
    .prepare<FoldersTable['owner_account'], Pick<FoldersTable, 'owner_account'>>(
      `SELECT owner_account FROM folders WHERE id = ?;`
    )
    .get(body.folderId);
  if (!folderData) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '创建失败，上级目录不存在' }));
    return;
  } else if (folderData.owner_account !== res.locals.user.account) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '创建失败，无权限操作' }));
    return;
  }

  useDatabase().transaction(() => {
    (body.fileList || []).forEach((file) => {
      let fileName = file.name;
      const duplicateFile = useDatabase()
        .prepare<Pick<FilesTable, 'name' | 'owner_folder_id'>, FilesTable>(
          `SELECT * FROM files WHERE name = $name AND owner_folder_id = $owner_folder_id;`
        )
        .get({ name: file.name, owner_folder_id: body.folderId }); // 查询重复名称文件

      if (duplicateFile) {
        fileName += `_${Date.now()}`;
      }

      useDatabase()
        .prepare<
          Pick<
            FilesTable,
            'id' | 'name' | 'size' | 'oss_path' | 'owner_folder_id' | 'owner_account'
          >
        >(
          `INSERT INTO files (id, name, size, oss_path, owner_folder_id, owner_account) VALUES ($id, $name, $size, $oss_path, $owner_folder_id, $owner_account);`
        )
        .run({
          id: `${body.folderId}-${createHash(fileName + file.ossPath + res.locals.user.account)}`,
          name: fileName,
          size: file.size,
          oss_path: file.ossPath,
          owner_folder_id: body.folderId,
          owner_account: res.locals.user.account
        }); // 插入文件数据
    });
  });

  res.json(defineResponseBody({ msg: '创建成功' }));
}
