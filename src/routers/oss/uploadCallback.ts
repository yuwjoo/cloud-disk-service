import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { DirectorysTable, ResourcesTable } from 'types/src/utils/database';
import type {
  UploadCallbackRequestBody,
  UploadCallbackResponseData
} from 'types/src/routers/oss/uploadCallback';
import type { NextFunction } from 'express';
import { useDatabase } from '@/utils/database';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { createVerify } from 'crypto';
import { base64ToString, queryStrToObject } from '@/utils/utils';
import http from 'http';
import https from 'https';
import { useConfig } from '@/utils/config';
import { authorization } from '@/middlewares/authorization';

let cachePublicKey: string; // 缓存的oss公钥

export default defineRoute({
  method: 'post',
  handler: [verifyCallback, authorization, uploadCallback],
  options: { authorization: false, requestBody: 'text' }
});

/**
 * @description: 校验上传回调
 * @param {Request} req 请求
 * @param {Response} res 响应
 * @param {NextFunction} next 通过函数
 */
async function verifyCallback(
  req: RouteRequest<UploadCallbackRequestBody>,
  res: RouteResponse<UploadCallbackResponseData>,
  next: NextFunction
) {
  if (!req.headers['authorization'] || !req.headers['x-oss-pub-key-url']) {
    res.json(defineResponseBody({ code: responseCode.error, msg: '拒绝请求' }));
    return;
  }
  const publickKey = await getPublicKey(req); // oss公钥
  const signature = await getAuthorization(req); // 签名
  const sign_str = await getSignStr(req); // 待签名字符串

  req.body = queryStrToObject(req.body as unknown as string) as UploadCallbackRequestBody;
  req.headers['Authorization'] = req.body.token;

  if (
    verifySignature(publickKey, signature, sign_str) &&
    req.body.bucket === useConfig().oss.bucketName
  ) {
    // 校验通过
    next();
  } else {
    // 校验失败
    res.json(defineResponseBody({ code: responseCode.error, msg: '拒绝请求' }));
  }
}

/**
 * @description: 上传回调接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function uploadCallback(
  req: RouteRequest<UploadCallbackRequestBody>,
  res: RouteResponse<UploadCallbackResponseData>
) {
  console.log(req.body);

  const { lastInsertRowid } = useDatabase()
    .prepare<Pick<ResourcesTable, 'object' | 'size' | 'type' | 'hash'>>(
      `INSERT INTO resources (object, size, type, hash) VALUES ($object, $size, $type, $hash)`
    )
    .run({
      object: req.body.object,
      size: req.body.size,
      type: req.body.type,
      hash: req.body.hash
    }); // 插入资源数据

  const currentFolder = useDatabase()
    .prepare<Pick<DirectorysTable, 'id' | 'create_account'>, Pick<DirectorysTable, 'id'>>(
      `SELECT id FROM directorys WHERE id = $id AND create_account = $create_account`
    )
    .get({
      id: req.body.folderId || res.locals.user.root_directory_id,
      create_account: res.locals.user.account
    }); // 查询当前文件夹

  if (!currentFolder) {
    // 无法访问
    res.json(defineResponseBody({ code: responseCode.error, msg: '无法访问该文件夹' }));
    return;
  }

  useDatabase().transaction(() => {
    useDatabase()
      .prepare<
        Pick<
          DirectorysTable,
          'name' | 'size' | 'type' | 'resources_id' | 'parent_id' | 'create_account'
        >
      >(
        `INSERT INTO directorys
          (name, size, type, resources_id, parent_id, create_account)
      VALUES
          ($name, $size, $type, $resources_id, $parent_id, $create_account)`
      )
      .run({
        name: req.body.name,
        size: req.body.size,
        type: req.body.type,
        resources_id: lastInsertRowid as number,
        parent_id: currentFolder.id,
        create_account: res.locals.user.account
      }); // 插入文件数据
    useDatabase()
      .prepare<Pick<ResourcesTable, 'id'>>(
        `UPDATE resources SET reference_count=1, modified_date=datetime (CURRENT_TIMESTAMP, 'localtime') WHERE id = $id;`
      )
      .run({ id: lastInsertRowid as number }); // 更新资源引用计数
  })();

  res.json(defineResponseBody({ msg: '上传成功' }));
}

/**
 * @description: 获取OSS的公钥
 * @param {RouteRequest} req 请求对象
 * @return {Promise<string>} 公钥文本
 */
async function getPublicKey(req: RouteRequest): Promise<string> {
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
function getAuthorization(req: RouteRequest): Promise<Buffer> {
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
async function getSignStr(req: RouteRequest): Promise<string> {
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
