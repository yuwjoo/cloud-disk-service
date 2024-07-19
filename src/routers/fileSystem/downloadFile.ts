import type { DirectorysTable, ResourcesTable } from 'types/src/utils/database';
import type {
  DownloadFileRequestBody,
  DownloadFileRequestQuery,
  DownloadFileResponseBody
} from 'types/src/routers/fileSystem/downloadFile';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { useAdmin } from '@/utils/oss';
import { joinPath } from '@/utils/utils';

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

    if (!query.filePath) {
      throw { code: responseCode.error, msg: '文件id不能为空' };
    }

    const pos = query.filePath.lastIndexOf('/');
    const folderPath = query.filePath.slice(0, pos);
    const filename = query.filePath.slice(pos + 1);
    const innerFilePath = joinPath(locals.user.root_path, folderPath);
    const fileRow = selectFile({ path: innerFilePath, name: filename });

    if (!fileRow) {
      throw { code: responseCode.error, msg: '未找到该文件' };
    }

    if (!fileRow.resources_id) {
      throw { code: responseCode.error, msg: '文件资源已被删除' };
    }

    const resourceRow = selectResource(fileRow.resources_id);

    if (!resourceRow) {
      throw { code: responseCode.error, msg: '文件资源已被删除' };
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
 * @description: 查询文件
 */
function selectFile(
  params: Pick<DirectorysTable, 'path' | 'name'>
): Pick<DirectorysTable, 'path' | 'name' | 'resources_id'> | undefined {
  const sql = `SELECT path, name, resources_id FROM directorys WHERE type = 'file' AND path = $path AND name = $name;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFile>>(sql).get(params);
}

/**
 * @description: 查询资源
 */
function selectResource(params: ResourcesTable['id']): Pick<ResourcesTable, 'object'> | undefined {
  const sql = `SELECT object FROM resources WHERE id = ?;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectResource>>(sql).get(params);
}
