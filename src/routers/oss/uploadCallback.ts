import type { ResourcesTable } from 'types/src/utils/database';
import type {
  UploadCallbackRequestBody,
  UploadCallbackRequestQuery,
  UploadCallbackResponseBody
} from 'types/src/routers/oss/uploadCallback';
import type { NextFunction } from 'express';
import type { ResourceFlagPayload } from 'types/src/routers/fileSystem/getResourceToken';
import { useDatabase } from '@/utils/database';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { createVerify } from 'crypto';
import { base64ToString, queryStrToObject } from '@/utils/utils';
import http from 'http';
import https from 'https';
import { useConfig } from '@/utils/config';
import { encrypt } from '@/utils/secure';

let cachePublicKey: string; // 缓存的oss公钥

/**
 * @description: 上传回调接口
 */
export default defineRoute({
  method: 'post',
  options: { authorization: false, bodyParser: 'text' },
  middlewares: [verifyCallback],
  handler: async (
    req: RouteRequest<UploadCallbackRequestBody, UploadCallbackRequestQuery, void>,
    res: RouteResponse<UploadCallbackResponseBody>
  ) => {
    const { body } = req;
    const { lastInsertRowid } = insertResource({
      object: body.object,
      size: body.size,
      hash: body.hash
    });
    const flag: ResourceFlagPayload = {
      token: body.token,
      resourceId: lastInsertRowid as number
    };

    res.json(defineResponseBody({ data: encrypt(JSON.stringify(flag)), msg: '上传成功' }));
  }
});

/**
 * @description: 校验上传回调
 * @param {Request} req 请求
 * @param {Response} res 响应
 * @param {NextFunction} next 通过函数
 */
async function verifyCallback(
  req: RouteRequest<string, UploadCallbackRequestQuery, void>,
  res: RouteResponse<UploadCallbackResponseBody>,
  next: NextFunction
) {
  let isError: boolean;

  try {
    const publickKey = await getPublicKey(req); // oss公钥
    const signature = await getAuthorization(req); // 签名
    const sign_str = await getSignStr(req); // 待签名字符串
    const verify = verifySignature(publickKey, signature, sign_str); // 校验签名

    isError = !verify || req.headers['x-oss-bucket'] !== useConfig().oss.bucketName;
  } catch (err) {
    isError = true;
  }

  if (isError) {
    // 校验失败
    res.json(defineResponseBody({ code: responseCode.error, msg: '拒绝请求' }));
    return;
  }

  // @ts-ignore
  req.body = queryStrToObject(req.body);
  next();
}

/**
 * @description: 获取OSS的公钥
 * @param {RouteRequest} req 请求对象
 * @return {Promise<string>} 公钥文本
 */
async function getPublicKey(
  req: RouteRequest<string, UploadCallbackRequestQuery, void>
): Promise<string> {
  const pubKeyUrl = base64ToString(req.headers['x-oss-pub-key-url'] as string);
  let httplib: typeof http | typeof https | undefined;

  if (pubKeyUrl.startsWith('http://gosspublic.alicdn.com/')) {
    httplib = http;
  } else if (pubKeyUrl.startsWith('https://gosspublic.alicdn.com/')) {
    httplib = https;
  }
  if (!httplib) {
    throw new Error('Failed: x-oss-pub-key-url field is not valid.');
  }
  return new Promise((resolve, reject) => {
    if (cachePublicKey) {
      resolve(cachePublicKey);
    } else {
      httplib.get(pubKeyUrl, async (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed: Get OSS public key ${res.statusCode} ${res.statusMessage}`));
        } else {
          let rawData = '';
          res.on('data', (chunk) => {
            rawData += chunk;
          });
          res.on('end', () => {
            cachePublicKey = rawData;
            resolve(rawData);
          });
          res.on('error', (err) => {
            reject(err);
          });
        }
      });
    }
  });
}

/**
 * @description: 获取base64解码后OSS的签名header
 * @param {RouteRequest} req 请求对象
 * @return {Buffer} 签名
 */
function getAuthorization(
  req: RouteRequest<string, UploadCallbackRequestQuery, void>
): Promise<Buffer> {
  const authorization = req.headers['authorization'];
  if (!authorization) {
    throw new Error('Failed: authorization field is not valid.');
  }
  return Promise.resolve(Buffer.from(authorization, 'base64'));
}

/**
 * @description: 获取待签名字符串
 * @param {RouteRequest} req 请求对象
 * @return {Promise<string>} 待签名字符串
 */
async function getSignStr(
  req: RouteRequest<string, UploadCallbackRequestQuery, void>
): Promise<string> {
  const fullReqUrl = new URL(req.url, `http://${req.headers.host}`);
  return decodeURIComponent(fullReqUrl.pathname) + fullReqUrl.search + '\n' + req.body;
}

/**
 * @description: 验证签名
 * @param {string} pubKey 公钥
 * @param {Buffer} signature 签名
 * @param {string} byteMD5 待签名字符串
 * @return {boolean} 校验结果
 */
function verifySignature(pubKey: string, signature: Buffer, byteMD5: string): boolean {
  const verify = createVerify('RSA-MD5');
  verify.update(byteMD5);
  return verify.verify(pubKey, signature);
}

/**
 * @description: 插入资源数据
 */
function insertResource(params: Pick<ResourcesTable, 'object' | 'size' | 'hash'>) {
  const sql = `INSERT INTO resources (object, size, hash) VALUES ($object, $size, $hash)`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
