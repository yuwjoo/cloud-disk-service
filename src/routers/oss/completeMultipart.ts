import type {
  CompleteMultipartRequestBody,
  CompleteMultipartRequestQuery,
  CompleteMultipartResponseBody
} from 'types/src/routers/oss/completeMultipart';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useAdmin } from '@/utils/oss';
import { getServerUrl } from '@/utils/utils';

/**
 * @description: 完成分片接口
 */
export default defineRoute({
  method: 'post',
  handler: async (
    req: RouteRequest<CompleteMultipartRequestBody, CompleteMultipartRequestQuery>,
    res: RouteResponse<CompleteMultipartResponseBody>
  ) => {
    const body = req.body;

    if (!body.fileHash || !body.object || !body.uploadId || !body.partList) {
      throw { code: responseCode.error, msg: '缺少参数' };
    }

    const response = await useAdmin().completeMultipartUpload(
      body.object,
      body.uploadId,
      body.partList,
      {
        headers: { 'x-oss-forbid-overwrite': true },
        callback: {
          url: `${getServerUrl()}/oss/uploadCallback`,
          body: 'object=${object}&size=${size}&clientIp=${clientIp}&hash=${x:hash}&token=${x:token}',
          contentType: 'application/x-www-form-urlencoded',
          customValue: { hash: body.fileHash, token: req.locals.token }
        }
      }
    );

    res.json(defineResponseBody({ data: (response.data as unknown as any).data }));
  }
});
