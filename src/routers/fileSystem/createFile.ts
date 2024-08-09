import type { DirectorysTable, ResourcesTable } from 'types/src/utils/database';
import type {
  CreateFileRequestBody,
  CreateFileRequestQuery,
  CreateFileResponseBody
} from 'types/src/routers/fileSystem/createFile';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { testFilename } from '@/utils/rules';
import { getServerUrl, joinPath, objectToQueryStr, toDBDate } from '@/utils/utils';
import { useAdmin } from '@/utils/oss';
import { generateCoverUrl, generateFileCover, generateOssObjectName } from '@/utils/file';

/**
 * @description: 创建文件接口
 */
export default defineRoute({
  method: 'post',
  handler: async (
    req: RouteRequest<CreateFileRequestBody, CreateFileRequestQuery>,
    res: RouteResponse<CreateFileResponseBody>
  ) => {
    const params = handleParams(req.body);
    const resourceRow = params.forceUpload ? undefined : findResource(params);
    let file: Required<CreateFileResponseBody>['data']['file'];
    let upload: Required<CreateFileResponseBody>['data']['upload'] = {};

    if (resourceRow) {
      file = createFile(params, req.locals, resourceRow);
    } else if (params.uploadMode === 'simple') {
      upload = {
        mode: 'simple',
        simpleUrl: await generateSimpleUrl(
          params.fileHash,
          params.fileName,
          params.mimeType,
          req.locals.user.account,
          req.locals.token
        )
      };
    } else {
      const { uploadId, name } = await useAdmin().initMultipartUpload(
        generateOssObjectName(req.locals.user.account, params.fileHash, params.fileName)
      ); // 初始化分片上传
      upload = {
        mode: 'multipart',
        ...(await generateMultiPartUrl(
          uploadId,
          1,
          name,
          params.partSize || 0,
          params.fileSize,
          params.fileHash,
          params.fileName,
          params.mimeType,
          req.locals.token
        ))
      };
    }

    res.json(defineResponseBody({ data: { folderPath: params.folderPath, file, upload } }));
  }
});

/**
 * @description: 处理参数
 * @param {CreateFileRequestBody} body body
 * @return {CreateFileRequestBody} 处理后的参数
 */
function handleParams(body: CreateFileRequestBody): CreateFileRequestBody {
  if (
    !body.fileHash ||
    body.fileSize === undefined ||
    !body.fileName ||
    !body.folderPath ||
    !body.uploadMode ||
    !body.mimeType
  ) {
    throw { code: responseCode.error, msg: '缺少参数' };
  }

  if (!testFilename(body.fileName)) {
    throw { code: responseCode.error, msg: '文件名不合法' };
  }

  return body;
}

/**
 * @description: 寻找资源
 * @param {CreateFileRequestBody} params 参数
 * @return {Pick<ResourcesTable, 'id' | 'size' | 'object'> | undefined} 查询结果
 */
function findResource(
  params: CreateFileRequestBody
): Pick<ResourcesTable, 'id' | 'size' | 'object'> | undefined {
  return useDatabase()
    .prepare<
      Pick<ResourcesTable, 'hash' | 'size'>,
      Pick<ResourcesTable, 'id' | 'size' | 'object'> | undefined
    >(
      `
        SELECT id, size, object 
        FROM resources 
        WHERE hash = $hash 
        AND size = $size;
      `
    )
    .get({ hash: params.fileHash, size: params.fileSize });
}

/**
 * @description: 创建文件
 * @param {CreateFileRequestBody} params 参数
 * @param {CustomLocals} locals 本地变量
 * @param {Pick<ResourcesTable, 'id' | 'size' | 'object'>} resourceRow 资源行
 * @return {Required<CreateFileResponseBody>['data']['file']} 文件数据
 */
function createFile(
  params: CreateFileRequestBody,
  locals: CustomLocals,
  resourceRow: Pick<ResourcesTable, 'id' | 'size' | 'object'>
): Required<CreateFileResponseBody>['data']['file'] {
  const folderPath = joinPath(locals.user.root_path, params.folderPath); // 获取文件夹路径
  const cover = generateFileCover(params.fileName) || resourceRow.object; // 生成封面
  const fileName = generateFileName(folderPath, params.fileName); // 生成文件名称
  const fileRow = insertFile(folderPath, fileName, resourceRow.size, cover, resourceRow.id); // 插入文件

  return {
    fullPath: joinPath(params.folderPath, fileRow.name),
    name: fileRow.name,
    size: fileRow.size,
    type: fileRow.type,
    cover: generateCoverUrl(fileRow.cover),
    createTime: new Date(fileRow.create_date).getTime(),
    modifiedTime: new Date(fileRow.modified_date).getTime()
  };
}

/**
 * @description: 生成简单上传url
 * @param {string} fileHash 文件哈希
 * @param {string} fileName 文件名
 * @param {string} mimeType 文件类型
 * @param {string} account 账号
 * @param {string} token 签名token
 * @return {Promise<string>} 上传url
 */
async function generateSimpleUrl(
  fileHash: string,
  fileName: string,
  mimeType: string,
  account: string,
  token: string
): Promise<string> {
  const expire = 1 * 60 * 60 * 3; // 过期时间
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

/**
 * @description: 插入文件
 * @param {string} path 目录路径
 * @param {string} name 文件名称
 * @param {number} size 文件大小
 * @param {string} cover 封面
 * @param {number} resourceId 资源ID
 * @return {Omit<DirectorysTable, 'id'> & { type: 'file' }} 插入文件数据
 */
function insertFile(
  path: string,
  name: string,
  size: number,
  cover: string,
  resourceId: number
): Omit<DirectorysTable, 'id'> & { type: 'file' } {
  const params: Omit<DirectorysTable, 'id'> & { type: 'file' } = {
    path,
    name,
    size,
    type: 'file',
    cover,
    resources_id: resourceId,
    create_date: toDBDate(Date.now()),
    modified_date: toDBDate(Date.now())
  };

  useDatabase().transaction(() => {
    // 将文件插入到目录下
    useDatabase()
      .prepare<
        Pick<
          DirectorysTable,
          'path' | 'name' | 'size' | 'cover' | 'resources_id' | 'create_date' | 'modified_date'
        >
      >(
        `
          INSERT INTO directorys 
            (path, name, size, type, cover, resources_id) 
          VALUES 
            ($path, $name, $size, 'file', $cover, $resources_id);
        `
      )
      .run(params);

    // 增加资源引用计数
    useDatabase()
      .prepare<ResourcesTable['id']>(
        `
          UPDATE resources 
          SET 
            reference_count = reference_count + 1,
            modified_date = datetime (CURRENT_TIMESTAMP, 'localtime')
          WHERE id = ?;
        `
      )
      .run(resourceId);
  })();

  return params;
}

/**
 * @description: 生成文件名称
 * @param {string} path 路径
 * @param {string} name 名称
 * @return {string} 文件名称
 */
function generateFileName(path: string, name: string): string {
  const i = name.lastIndexOf('.');

  // 文件名重复校验
  if (
    useDatabase()
      .prepare<Pick<DirectorysTable, 'path' | 'name'>, Pick<DirectorysTable, 'id'>>(
        `
        SELECT id 
        FROM directorys 
        WHERE type = 'file' 
        AND path = $path 
        AND name = $name;
        `
      )
      .get({ path, name })
  ) {
    return i === -1 ? `${name}_${Date.now()}` : `${name.slice(0, i)}_${Date.now()}${name.slice(i)}`;
  }

  return name;
}
