import type {
  GetUploadIdRequestBody,
  GetUploadIdRequestQuery,
  GetUploadIdResponseBody
} from 'types/src/routers/oss/getUploadId';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useAdmin } from '@/utils/oss';
import { generateOssObjectName } from '@/utils/file';

/**
 * @description: 获取上传id接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<GetUploadIdRequestBody, GetUploadIdRequestQuery>,
    res: RouteResponse<GetUploadIdResponseBody>
  ) => {
    const query = req.query;

    if (!query.mimeType || !query.fileHash || !query.fileName) {
      throw { code: responseCode.error, msg: '缺少参数' };
    }

    const { uploadId, name } = await useAdmin().initMultipartUpload(
      generateOssObjectName(req.locals.user.account, query.fileHash, query.fileName)
    );

    res.json(defineResponseBody({ data: { uploadId, object: name } }));
  }
});
