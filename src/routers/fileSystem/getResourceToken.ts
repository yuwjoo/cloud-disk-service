import type { ResourcesTable } from 'types/src/utils/database';
import type {
  GetResourceTokenRequestBody,
  GetResourceTokenRequestQuery,
  GetResourceTokenResponseBody,
  ResourceFlagPayload
} from 'types/src/routers/fileSystem/getResourceToken';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { encrypt } from '@/utils/secure';

/**
 * @description: 获取资源标识接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<GetResourceTokenRequestBody, GetResourceTokenRequestQuery>,
    res: RouteResponse<GetResourceTokenResponseBody>
  ) => {
    const { query, locals } = req;

    if (!query.fileHash) {
      throw { code: responseCode.error, msg: '缺少参数' };
    }

    const resourceRow = selectResource({ hash: query.fileHash });

    const flag: ResourceFlagPayload = {
      token: locals.token,
      resourceId: resourceRow?.id || -1
    };
    const flagText = resourceRow ? encrypt(JSON.stringify(flag)) : undefined;

    res.json(defineResponseBody({ data: flagText }));
  }
});

/**
 * @description: 查询资源
 */
function selectResource(params: Pick<ResourcesTable, 'hash'>) {
  type SQLResult = Pick<ResourcesTable, 'id'>;

  const sql = `SELECT id FROM resources WHERE hash = $hash;`;
  return useDatabase().prepare<typeof params, SQLResult>(sql).get(params);
}
