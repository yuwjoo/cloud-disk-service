import type {
  GetMultipartsRequestBody,
  GetMultipartsRequestQuery,
  GetMultipartsResponseBody
} from 'types/src/routers/oss/getMultiparts';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useAdmin } from '@/utils/oss';

/**
 * @description: 获取分片接口
 */
export default defineRoute({
  method: 'post',
  handler: async (
    req: RouteRequest<GetMultipartsRequestBody, GetMultipartsRequestQuery>,
    res: RouteResponse<GetMultipartsResponseBody>
  ) => {
    const body = req.body;

    if (!body.mimeType || !body.uploadId || !body.object || !body.partNumbers) {
      throw { code: responseCode.error, msg: '缺少参数' };
    }

    const partList = await Promise.all(
      body.partNumbers.map((num) =>
        generateMultiPartUrl(body.uploadId, num, body.object, body.mimeType)
      )
    );

    res.json(defineResponseBody({ data: partList }));
  }
});

/**
 * @description: 生成分片
 * @param {string} uploadId 上传id
 * @param {number} partNumber 分片序号
 * @param {string} object object名称
 * @param {string} mimeType 文件类型
 * @returns {Promise<{ number: number; url: string; expire: number }>} 分片数据
 */
async function generateMultiPartUrl(
  uploadId: string,
  partNumber: number,
  object: string,
  mimeType: string
): Promise<{ number: number; url: string; expire: number }> {
  const expire = 1 * 60 * 60 * 3; // 过期时间
  const url = await useAdmin().signatureUrlV4(
    'PUT',
    expire,
    {
      headers: { 'Content-Type': mimeType },
      queries: { partNumber: partNumber, uploadId }
    },
    object
  );
  return { number: partNumber, url, expire };
}
