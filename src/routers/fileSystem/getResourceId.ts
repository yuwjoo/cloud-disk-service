import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { ResourcesTable } from 'types/src/utils/database';
import type {
  GetResourceIdRequestQuery,
  GetResourceIdResponseData
} from 'types/src/routers/fileSystem/getResourceId';
import { defineResponseBody, defineRoute } from '@/utils/router';
import { useDatabase } from '@/utils/database';

export default defineRoute({
  method: 'get',
  handler: getResourceId
});

/**
 * @description: 获取指定资源id接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function getResourceId(
  req: RouteRequest<any, GetResourceIdRequestQuery>,
  res: RouteResponse<GetResourceIdResponseData>
) {
  const resourceRow = useDatabase()
    .prepare<Pick<ResourcesTable, 'hash' | 'create_account'>, Pick<ResourcesTable, 'id'>>(
      `SELECT id FROM resources WHERE hash = $hash AND create_account = $create_account`
    )
    .get({ hash: req.query.hash, create_account: res.locals.user.account });

  res.json(defineResponseBody({ data: { id: resourceRow ? resourceRow.id : undefined } }));
}
