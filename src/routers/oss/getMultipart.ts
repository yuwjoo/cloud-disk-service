import type {
  GetMultipartRequestBody,
  GetMultipartRequestQuery,
  GetMultipartResponseBody
} from 'types/src/routers/oss/getMultipart';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { getServerUrl, objectToQueryStr } from '@/utils/utils';
import { useAdmin } from '@/utils/oss';
import { generateOssObjectName } from '@/utils/file';

/**
 * @description: 获取分片上传接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<GetMultipartRequestBody, GetMultipartRequestQuery>,
    res: RouteResponse<GetMultipartResponseBody>
  ) => {
    const params = handleParams(req.query);
    const multipart = await generateMultiPartUrl(
      params.uploadId,
      params.startPartNumber,
      generateOssObjectName(req.locals.user.account, params.fileHash, params.fileName),
      params.partSize,
      params.fileSize,
      params.fileHash,
      params.fileName,
      params.mimeType,
      req.locals.token
    );

    res.json(defineResponseBody({ data: multipart }));
  }
});

/**
 * @description: 处理参数
 * @param {GetMultipartRequestQuery} query query
 * @return {GetMultipartRequestQuery} 处理后的参数
 */
function handleParams(query: GetMultipartRequestQuery): GetMultipartRequestQuery {
  if (
    !query.uploadId ||
    query.startPartNumber === undefined ||
    !query.fileHash ||
    query.fileSize === undefined ||
    !query.fileName ||
    !query.mimeType ||
    query.partSize === undefined
  ) {
    throw { code: responseCode.error, msg: '缺少参数' };
  }

  return query;
}

/**
 * @description: 生成分片上传url
 * @param {string} uploadId 分片id
 * @param {number} startPartNumber 起始分片序号
 * @param {string} object object名称
 * @param {number} partSize 分片大小，单位为KB，默认为1MB，minimum为100KB
 * @param {number} fileSize 文件大小
 * @param {string} fileHash 文件hash
 * @param {string} fileName 文件名
 * @param {string} mimeType 文件类型
 * @param {string} token 签名token
 * @returns {Promise<{ partSize: number; startPartNumber: number; multipartUrls: string[]; nextMultipartUrl?: string; submitMultiPartUrl?: string }>} 分片上传数据
 */
async function generateMultiPartUrl(
  uploadId: string,
  startPartNumber: number,
  object: string,
  partSize: number,
  fileSize: number,
  fileHash: string,
  fileName: string,
  mimeType: string,
  token: string
): Promise<{
  partSize: number;
  startPartNumber: number;
  multipartUrls: string[];
  nextMultipartUrl?: string;
  submitMultiPartUrl?: string;
}> {
  const expire = 1 * 60 * 60 * 3; // 过期时间
  const size = Math.max(1 * 1024 * 100, partSize || 1 * 1024 * 1024); // 分片大小默认1MB，最小100KB
  const count = Math.ceil(fileSize / size); // 分片总数
  const forCount = Math.min(100, count - startPartNumber + 1); // 循环次数，最多100次

  const multipartUrls = Array.from({ length: forCount }).map((_, i) => {
    return useAdmin().signatureUrlV4(
      'PUT',
      expire,
      {
        headers: { 'Content-Type': mimeType },
        queries: { partNumber: startPartNumber + i, uploadId }
      },
      object
    );
  }); // 生成分片上传url

  if (startPartNumber - 1 + forCount < count) {
    const nextUrlQuery = objectToQueryStr({
      uploadId,
      startPartNumber: startPartNumber + forCount,
      partSize: size,
      fileHash,
      fileSize,
      fileName,
      mimeType
    });
    return {
      partSize: size,
      startPartNumber,
      multipartUrls: await Promise.all(multipartUrls),
      nextMultipartUrl: getServerUrl() + '/oss/getMultipart?' + nextUrlQuery
    };
  } else {
    const submitMultiPartUrl = useAdmin().signatureUrlV4(
      'POST',
      expire,
      {
        headers: { 'x-oss-forbid-overwrite': true },
        queries: { uploadId, ...getUrlCallback(fileHash, token) }
      },
      object
    );
    return {
      partSize: size,
      startPartNumber,
      multipartUrls: await Promise.all(multipartUrls),
      submitMultiPartUrl: await submitMultiPartUrl
    };
  }
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
        callbackUrl: `${getServerUrl}/oss/uploadCallback`,
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
