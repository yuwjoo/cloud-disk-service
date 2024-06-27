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

    const rootFolderRow = selectFolderById(locals.user.root_folder_id);
    const fileRow = selectFile(query.fileId);

    if (!rootFolderRow || !fileRow || !fileRow.parent_path.startsWith(rootFolderRow.parent_path)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '无法访问该文件' }));
      return;
    }

    if (!fileRow.resources_id) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '未关联资源' }));
      return;
    }

    const resourceRow = selectResource(fileRow.resources_id);

    if (!resourceRow) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '资源未找到' }));
      return;
    }

    const downloadUrl = useAdmin().signatureUrl(resourceRow.object, {
      expires: 5, // 签名url过期时间（秒）
      response: {
        'content-disposition': `attachment; filename=${encodeURIComponent(fileRow.name)}` // 下载文件名
      }
    });

    res.json(defineResponseBody({ data: downloadUrl }));
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
 * @description: 查询文件
 */
function selectFile(
  params: DirectorysTable['id']
): Pick<DirectorysTable, 'parent_path' | 'name' | 'resources_id'> | undefined {
  const sql = `SELECT parent_path, name, resources_id FROM directorys WHERE type = 'file' AND id = ?;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFile>>(sql).get(params);
}

/**
 * @description: 查询资源
 */
function selectResource(params: ResourcesTable['id']): Pick<ResourcesTable, 'object'> | undefined {
  const sql = `SELECT object FROM resources WHERE id = ?;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectResource>>(sql).get(params);
}
