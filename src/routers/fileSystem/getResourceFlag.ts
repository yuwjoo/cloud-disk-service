import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { ResourcesTable } from 'types/src/utils/database';
import type {
  GetResourceFlagRequestQuery,
  GetResourceFlagResponseData,
  ResourceFlag
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
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function getResourceFlag(
  req: RouteRequest<any, GetResourceFlagRequestQuery>,
  res: RouteResponse<GetResourceFlagResponseData>
) {
  const resourceRow = useDatabase()
    .prepare<Pick<ResourcesTable, 'hash' | 'size'>, Pick<ResourcesTable, 'id'>>(
      `SELECT id FROM resources WHERE hash = $hash AND size = $size`
    )
    .get({ hash: req.query.fileHash, size: req.query.fileSize });

  const flag: ResourceFlag = { token: res.locals.token, resourceId: resourceRow?.id || -1 };
  const flagText = resourceRow ? encrypt(JSON.stringify(flag)) : undefined;

  res.json(defineResponseBody({ data: { resourceFlag: flagText } }));
}
