import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { FoldersTable } from 'types/src/utils/database';
import type {
  UploadCallbackRequestBody,
  UploadCallbackResponseData
} from 'types/src/routers/oss/uploadCallback';
import type { NextFunction } from 'express';
import { useDatabase } from '@/utils/database';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { createHash, createVerify, getHashes, randomUUID } from 'crypto';
import { base64ToString, queryStrToObject } from '@/utils/utils';
import http from 'http';
import https from 'https';
import { useConfig } from '@/utils/config';

let cachePublicKey: string; // 缓存的oss公钥

export default defineRoute({
  method: 'post',
  handler: [verifyCallback, uploadCallback],
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

  // let folderUUID = body.folderUUID;

  // if (!folderUUID) {
  //   const rootFolder = useDatabase()
  //     .prepare<unknown[], Pick<FoldersTable, 'uuid' | 'owner_account'>>(
  //       `SELECT uuid, owner_account FROM folders WHERE owner_folder_uuid IS NULL`
  //     )
  //     .get()!; // 获取root文件夹

  //   if (res.locals.user.account !== rootFolder.owner_account) {
  //     folderUUID = useDatabase()
  //       .prepare<{ owner_folder_uuid: string; owner_account: string }, Pick<FoldersTable, 'uuid'>>(
  //         `SELECT uuid FROM folders WHERE owner_folder_uuid = $owner_folder_uuid AND owner_account = $owner_account`
  //       )
  //       .get({ owner_folder_uuid: rootFolder.uuid, owner_account: res.locals.user.account })!.uuid;
  //   } else {
  //     folderUUID = rootFolder.uuid;
  //   }
  // } else {
  //   const parentFolder = useDatabase()
  //     .prepare<string, Pick<FoldersTable, 'owner_account'>>(
  //       `SELECT owner_account FROM folders WHERE uuid = $uuid`
  //     )
  //     .get(folderUUID);
  //   if (res.locals.user.account !== parentFolder?.owner_account) {
  //     // 无权限访问
  //     res.json(defineResponseBody({ code: responseCode.error, msg: '无权限访问该文件夹' }));
  //     return;
  //   }
  // }

  // useDatabase().transaction(() => {
  //   const insertInfo = useDatabase()
  //     .prepare<{
  //       name: string;
  //       size: number;
  //       type: string;
  //       oss_path: string;
  //       hash: string;
  //       create_account: string;
  //     }>(
  //       `INSERT INTO resources
  //         (name, size, type, oss_path, hash, create_account)
  //        VALUES
  //         ($name, $size, $type, $oss_path, $hash, $create_account)`
  //     )
  //     .run({
  //       name: body.name,
  //       size: body.size,
  //       type: body.type,
  //       oss_path: body.ossPath,
  //       hash: body.hash,
  //       create_account: res.locals.user.account
  //     }); // 插入资源数据

  //   useDatabase()
  //     .prepare<{
  //       uuid: string;
  //       name: string;
  //       size: number;
  //       type: string;
  //       resources_id: number;
  //       owner_folder_uuid: string;
  //       owner_account: string;
  //     }>(
  //       `INSERT INTO files
  //         (uuid, name, size, type, resources_id, owner_folder_uuid, owner_account)
  //        VALUES
  //         ($uuid, $name, $size, $type, $resources_id, $owner_folder_uuid, $owner_account)`
  //     )
  //     .run({
  //       uuid: randomUUID(),
  //       name: body.name,
  //       size: body.size,
  //       type: body.type,
  //       resources_id: insertInfo.lastInsertRowid as number,
  //       owner_folder_uuid: folderUUID,
  //       owner_account: res.locals.user.account
  //     }); // 插入文件数据
  // })();

  res.json(defineResponseBody({ msg: '创建成功' }));
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
