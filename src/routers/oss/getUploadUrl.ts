import type {
  GetUploadUrlRequestBody,
  GetUploadUrlRequestQuery,
  GetUploadUrlResponseBody
} from 'types/src/routers/oss/getUploadUrl';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { getServerUrl, objectToQueryStr } from '@/utils/utils';
import { useAdmin } from '@/utils/oss';
import { generateOssObjectName } from '@/utils/file';

/**
 * @description: 获取上传url接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<GetUploadUrlRequestBody, GetUploadUrlRequestQuery>,
    res: RouteResponse<GetUploadUrlResponseBody>
  ) => {
    const query = req.query;

    if (!query.mimeType || !query.fileHash || !query.fileName) {
      throw { code: responseCode.error, msg: '缺少参数' };
    }

    const expire = 1 * 60 * 60 * 3; // 过期时间
    const uploadUrl = await generateSimpleUrl(
      query.fileHash,
      query.fileName,
      query.mimeType,
      req.locals.user.account,
      req.locals.token,
      expire
    );

    res.json(defineResponseBody({ data: { uploadUrl, expire: Date.now() + expire * 1000 } }));
  }
});

/**
 * @description: 生成简单上传url
 * @param {string} fileHash 文件哈希
 * @param {string} fileName 文件名
 * @param {string} mimeType 文件类型
 * @param {string} account 账号
 * @param {string} token 签名token
 * @param {number} expire 过期时间
 * @return {Promise<string>} 上传url
 */
async function generateSimpleUrl(
  fileHash: string,
  fileName: string,
  mimeType: string,
  account: string,
  token: string,
  expire: number
): Promise<string> {
  return await useAdmin().signatureUrlV4(
    'PUT',
    expire,
    {
      headers: {
        'Content-Type': mimeType,
        'x-oss-forbid-overwrite': true,
        'x-oss-object-acl': 'private',
        'x-oss-storage-class': 'Standard'
      },
      queries: getUrlCallback(fileHash, token)
    },
    generateOssObjectName(account, fileHash, fileName)
  );
}

/**
 * @description 生成url回调配置
 * @param {string} fileHash 文件hash
 * @param {string} token  用户token
 * @returns {Record<string, any>} 回调配置
 */
function getUrlCallback(fileHash: string, token: string): Record<string, any> {
  return {
    callback: btoa(
      JSON.stringify({
        callbackUrl: `${getServerUrl()}/oss/uploadCallback`,
        callbackBody:
          'object=${object}&size=${size}&clientIp=${clientIp}&hash=${x:hash}&token=${x:token}',
        callbackBodyType: 'application/x-www-form-urlencoded'
      })
    ),
    'callback-var': btoa(
      JSON.stringify({
        'x:hash': fileHash,
        'x:token': token
      })
    )
  };
}
