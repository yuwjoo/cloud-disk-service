import type { DirectorysTable, ResourcesTable } from 'types/src/utils/database';
import type {
  DownloadFileRequestBody,
  DownloadFileRequestQuery,
  DownloadFileResponseBody
} from 'types/src/routers/fileSystem/downloadFile';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { useAdmin } from '@/utils/oss';

export default defineRoute({
  method: 'get',
  handler: downloadFile
});

/**
 * @description: 下载文件接口
 * @param {RouteRequest} req 请求
 * @param {RouteResponse} res 响应
 */
async function downloadFile(
  req: RouteRequest<DownloadFileRequestBody, DownloadFileRequestQuery>,
  res: RouteResponse<DownloadFileResponseBody>
) {
  if (!req.query.fileId) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '缺少参数' }));
    return;
  }

  const directory = useDatabase()
    .prepare<
      DirectorysTable['id'],
      Pick<DirectorysTable, 'name' | 'parent_id' | 'type' | 'resources_id' | 'create_account'>
    >(`SELECT name, parent_id, type, resources_id, create_account FROM directorys WHERE id = ?`)
    .get(req.query.fileId); // 查询文件

  if (!directory || directory.create_account !== res.locals.user.account) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '无法访问该文件' }));
    return;
  }

  if (directory.type === 'folder' || !directory.resources_id) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '非文件类型, 无法下载' }));
    return;
  }

  const resource = useDatabase()
    .prepare<ResourcesTable['id'], Pick<ResourcesTable, 'object'>>(
      `SELECT object FROM resources WHERE id = ?`
    )
    .get(directory.resources_id); // 查询文件

  if (!resource) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '相关资源不存在' }));
    return;
  }

  const downloadUrl = useAdmin().signatureUrl(resource.object, {
    expires: 5,
    response: {
      'content-disposition': `attachment; filename=${encodeURIComponent(directory.name)}`
    }
  });

  res.json(defineResponseBody({ data: downloadUrl }));
}
