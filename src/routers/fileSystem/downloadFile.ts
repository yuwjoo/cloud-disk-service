import type { DirectorysTable, ResourcesTable } from 'types/src/utils/database';
import type {
  DownloadFileRequestBody,
  DownloadFileRequestQuery,
  DownloadFileResponseBody
} from 'types/src/routers/fileSystem/downloadFile';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { useAdmin } from '@/utils/oss';

/**
 * @description: 下载文件接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<DownloadFileRequestBody, DownloadFileRequestQuery>,
    res: RouteResponse<DownloadFileResponseBody>
  ) => {
    const { query, locals } = req;

    if (!query.fileId) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '文件id不能为空' }));
      return;
    }

    const directoryRow = selectFile(query.fileId);

    if (!directoryRow || !directoryRow.folder_path?.startsWith(locals.user.root_folder_path)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '无法访问该文件' }));
      return;
    }

    if (directoryRow.type === 'folder' || !directoryRow.resources_id) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '非文件类型, 无法下载' }));
      return;
    }

    const resourceRow = selectResource(directoryRow.resources_id);

    if (!resourceRow) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '相关资源不存在' }));
      return;
    }

    const downloadUrl = useAdmin().signatureUrl(resourceRow.object, {
      expires: 5, // 签名url过期时间（秒）
      response: {
        'content-disposition': `attachment; filename=${encodeURIComponent(directoryRow.name)}` // 下载文件名
      }
    });

    res.json(defineResponseBody({ data: downloadUrl }));
  }
});

/**
 * @description: 查询文件
 */
function selectFile(
  params: DirectorysTable['id']
): Pick<DirectorysTable, 'folder_path' | 'name' | 'type' | 'resources_id'> | undefined {
  const sql = `SELECT folder_path, name, type, resources_id FROM directorys WHERE id = ?;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFile>>(sql).get(params);
}

/**
 * @description: 查询资源
 */
function selectResource(params: ResourcesTable['id']): Pick<ResourcesTable, 'object'> | undefined {
  const sql = `SELECT object FROM resources WHERE id = ?;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectResource>>(sql).get(params);
}
