import type { DirectorysTable, ResourcesTable } from 'types/src/utils/database';
import type {
  CreateFileRequestBody,
  CreateFileRequestQuery,
  CreateFileResponseBody
} from 'types/src/routers/fileSystem/createFile';
import type { ResourceFlagPayload } from 'types/src/routers/fileSystem/getResourceFlag';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { decrypt } from '@/utils/secure';

/**
 * @description: 创建文件接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<CreateFileRequestBody, CreateFileRequestQuery>,
    res: RouteResponse<CreateFileResponseBody>
  ) => {
    const { query, locals } = req;

    if (!query.fileName || !query.resourceFlag) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '缺少参数' }));
      return;
    }

    const folderPath = query.parentFolderPath || locals.user.root_folder_path;

    if (!folderPath.startsWith(locals.user.root_folder_path)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '无权限访问' }));
      return;
    }

    let resourceFlag: ResourceFlagPayload | undefined; // 资源标识数据

    try {
      const data = JSON.parse(decrypt(query.resourceFlag));
      if (data.token === locals.token) resourceFlag = data;
    } catch (err) {}

    if (!resourceFlag) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '资源标识已失效' }));
      return;
    }

    const resource = selectResource(resourceFlag.resourceId);

    if (!resource) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '资源不存在' }));
      return;
    }

    let fileName = query.fileName;
    const repeatFile = selectFile({ folder_path: folderPath, name: query.fileName });

    if (repeatFile) {
      // 文件名重复，追加时间戳文本
      let pos = fileName.lastIndexOf('.');
      if (pos === -1) {
        fileName = `${fileName}_${Date.now()}`;
      } else {
        fileName = `${fileName.slice(0, pos)}_${Date.now()}${fileName.slice(pos)}`;
      }
    }

    let fileData: CreateFileResponseBody['data'] | undefined;
    useDatabase().transaction(() => {
      const { lastInsertRowid } = createFile({
        folder_path: folderPath,
        name: fileName,
        size: resource.size,
        mime_type: resource.mime_type,
        resources_id: resource.id,
        create_account: locals.user.account
      });
      addResourcReferenceCounte(resource.id);

      fileData = {
        id: lastInsertRowid as number,
        name: fileName,
        size: resource.size,
        type: 'file',
        mimeType: resource.mime_type,
        parentFolderPath: folderPath,
        createTime: (Date.now() / 1000) * 1000,
        modifiedTime: (Date.now() / 1000) * 1000
      };
    })();

    res.json(defineResponseBody({ data: fileData, msg: '创建成功' }));
  }
});

/**
 * @description: 查询资源
 */
function selectResource(
  params: ResourcesTable['id']
): Pick<ResourcesTable, 'id' | 'size' | 'mime_type'> | undefined {
  const sql = `SELECT id, size, mime_type FROM resources WHERE id = ?;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectResource>>(sql).get(params);
}

/**
 * @description: 查询文件
 */
function selectFile(
  params: Pick<DirectorysTable, 'folder_path' | 'name'>
): Pick<DirectorysTable, 'id'> | undefined {
  const sql = `SELECT id FROM directorys WHERE type = 'file' AND folder_path = $folder_path AND name = $name;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFile>>(sql).get(params);
}

/**
 * @description: 创建文件
 */
function createFile(
  params: Pick<
    DirectorysTable,
    'folder_path' | 'name' | 'size' | 'mime_type' | 'resources_id' | 'create_account'
  >
) {
  const sql = `INSERT INTO directorys (folder_path, name, size, type, mime_type, resources_id, create_account) VALUES ($folder_path, $name, $size, 'file', $mime_type, $resources_id, $create_account);`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}

/**
 * @description: 增加资源引用计数
 */
function addResourcReferenceCounte(params: ResourcesTable['id']) {
  const sql = `UPDATE resources SET reference_count = reference_count + 1, modified_date = datetime (CURRENT_TIMESTAMP, 'localtime') WHERE id = ?;`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
