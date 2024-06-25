import type { ResourcesTable } from 'types/src/utils/database';
import type {
  GetResourceFlagRequestBody,
  GetResourceFlagRequestQuery,
  GetResourceFlagResponseBody,
  ResourceFlagPayload
} from 'types/src/routers/fileSystem/getResourceFlag';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { encrypt } from '@/utils/secure';

/**
 * @description: 获取资源标识接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<GetResourceFlagRequestBody, GetResourceFlagRequestQuery>,
    res: RouteResponse<GetResourceFlagResponseBody>
  ) => {
    const { query } = req;

    if (!query.fileHash || query.fileSize === undefined) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '缺少参数' }));
      return;
    }

    const resourceRow = selectResource({ hash: query.fileHash, size: query.fileSize });

    const flag: ResourceFlagPayload = {
      token: res.locals.token,
      resourceId: resourceRow?.id || -1
    };
    const flagText = resourceRow ? encrypt(JSON.stringify(flag)) : undefined;

    res.json(defineResponseBody({ data: { resourceFlag: flagText } }));
  }
});

/**
 * @description: 查询资源
 */
function selectResource(params: Pick<ResourcesTable, 'hash' | 'size'>) {
  type SQLResult = Pick<ResourcesTable, 'id'>;

  const sql = `SELECT id FROM resources WHERE hash = $hash AND size = $size;`;
  return useDatabase().prepare<typeof params, SQLResult>(sql).get(params);
}
