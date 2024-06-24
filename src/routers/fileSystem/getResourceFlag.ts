import type { ResourcesTable } from 'types/src/utils/database';
import type {
  GetResourceFlagRequestBody,
  GetResourceFlagRequestQuery,
  GetResourceFlagResponseBody,
  ResourceFlagPayload
} from 'types/src/routers/fileSystem/getResourceFlag';
import { defineResponseBody, defineRoute } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { encrypt } from '@/utils/secure';

export default defineRoute({
  method: 'get',
  handler: getResourceFlag
});

/**
 * @description: 获取资源标识接口
 * @param {RouteRequest} req 请求
 * @param {RouteResponse} res 响应
 */
async function getResourceFlag(
  req: RouteRequest<GetResourceFlagRequestBody, GetResourceFlagRequestQuery>,
  res: RouteResponse<GetResourceFlagResponseBody>
) {
  const resourceRow = useDatabase()
    .prepare<Pick<ResourcesTable, 'hash' | 'size'>, Pick<ResourcesTable, 'id'>>(
      `SELECT id FROM resources WHERE hash = $hash AND size = $size`
    )
    .get({ hash: req.query.fileHash, size: req.query.fileSize });

  const flag: ResourceFlagPayload = { token: res.locals.token, resourceId: resourceRow?.id || -1 };
  const flagText = resourceRow ? encrypt(JSON.stringify(flag)) : undefined;

  res.json(defineResponseBody({ data: { resourceFlag: flagText } }));
}
