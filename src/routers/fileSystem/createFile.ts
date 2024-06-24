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

export default defineRoute({
  method: 'get',
  handler: createFile
});

/**
 * @description: 创建文件接口
 * @param {RouteRequest} req 请求
 * @param {RouteResponse} res 响应
 */
async function createFile(
  req: RouteRequest<CreateFileRequestBody, CreateFileRequestQuery>,
  res: RouteResponse<CreateFileResponseBody>
) {
  if (!req.query.fileName || !req.query.resourceFlag) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '缺少参数' }));
    return;
  }

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

  let resourceFlagData: ResourceFlagPayload; // 资源标识数据
  let isFlagExpire: boolean; // 标识已失效

  try {
    resourceFlagData = JSON.parse(decrypt(req.query.resourceFlag));
    isFlagExpire = resourceFlagData.token !== res.locals.token;
  } catch (err) {
    isFlagExpire = true;
  }

  if (isFlagExpire) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '资源标识已失效' }));
    return;
  }

  const resource = useDatabase()
    .prepare<ResourcesTable['id'], Pick<ResourcesTable, 'id' | 'size' | 'type'>>(
      `SELECT id, size, type FROM resources WHERE id = ?`
    )
    .get(resourceFlagData!.resourceId);

  if (!resource) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '资源不存在' }));
    return;
  }

  const repeatFile = useDatabase()
    .prepare<Pick<DirectorysTable, 'parent_id' | 'name'>, Pick<DirectorysTable, 'id'>>(
      `SELECT id FROM directorys WHERE parent_id = $parent_id AND name = $name`
    )
    .get({
      parent_id: folderId,
      name: req.query.fileName
    });

  let fileName = req.query.fileName;
  if (repeatFile) {
    const pos = fileName.lastIndexOf('.');
    fileName = `${fileName.slice(0, pos)}_${Date.now()}${fileName.slice(pos)}`;
  }

  let fileId: number | undefined;
  useDatabase().transaction(() => {
    const { lastInsertRowid } = useDatabase()
      .prepare<
        Pick<
          DirectorysTable,
          'name' | 'size' | 'type' | 'resources_id' | 'parent_id' | 'create_account'
        >
      >(
        `INSERT INTO directorys
          (name, size, type, resources_id, parent_id, create_account)
      VALUES
          ($name, $size, $type, $resources_id, $parent_id, $create_account)`
      )
      .run({
        name: fileName,
        size: resource.size,
        type: resource.type,
        resources_id: resource.id,
        parent_id: folderId,
        create_account: res.locals.user.account
      }); // 插入文件数据
    fileId = lastInsertRowid as number;
    useDatabase()
      .prepare<ResourcesTable['id']>(
        `UPDATE resources SET reference_count = reference_count + 1, modified_date = datetime (CURRENT_TIMESTAMP, 'localtime') WHERE id = ?;`
      )
      .run(resource.id); // 更新资源引用计数
  })();

  res.json(
    defineResponseBody({
      data: {
        folderId,
        fileData: {
          id: fileId!,
          name: fileName,
          size: resource.size,
          type: resource.type,
          createTime: Date.now(),
          modifiedTime: Date.now()
        }
      },
      msg: '创建成功'
    })
  );
}
