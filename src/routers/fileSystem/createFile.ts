import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { ResourcesTable } from 'types/src/utils/database';
import type {
  CreateFileRequestQuery,
  CreateFileResponseData
} from 'types/src/routers/fileSystem/createFile';
import { defineResponseBody, defineRoute } from '@/utils/router';
import { useDatabase } from '@/utils/database';

export default defineRoute({
  method: 'get',
  handler: createFile
});

/**
 * @description: 创建文件接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function createFile(
  req: RouteRequest<any, CreateFileRequestQuery>,
  res: RouteResponse<CreateFileResponseData>
) {
  res.json(defineResponseBody({}));
}
