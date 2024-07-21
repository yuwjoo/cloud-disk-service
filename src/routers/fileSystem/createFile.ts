import type { DirectorysTable, ResourcesTable } from 'types/src/utils/database';
import type {
  CreateFileRequestBody,
  CreateFileRequestQuery,
  CreateFileResponseBody
} from 'types/src/routers/fileSystem/createFile';
import type { ResourceFlagPayload } from 'types/src/routers/fileSystem/getResourceFlag';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { decrypt } from '@/utils/secure';
import { testFilename } from '@/utils/rules';
import { joinPath } from '@/utils/utils';
import { useAdmin } from '@/utils/oss';

/**
 * @description: 创建文件接口
 */
export default defineRoute({
  method: 'post',
  handler: async (
    req: RouteRequest<CreateFileRequestBody, CreateFileRequestQuery>,
    res: RouteResponse<CreateFileResponseBody>
  ) => {
    const { body, locals } = req;

    checkParams(body);

    const innerFolderPath = joinPath(locals.user.root_path, body.folderPath);
    const resource = body.forceUpload
      ? null
      : selectResource({ hash: body.fileHash, size: body.fileSize });

    if (resource) {
      const cover = getFileCover(body.fileName, resource.object);
      const fileName = getFileName(innerFolderPath, body.fileName);

      let fileData: Required<CreateFileResponseBody>['data']['file'];

      useDatabase().transaction(() => {
        createFile({
          path: innerFolderPath,
          name: fileName,
          size: resource.size,
          cover,
          resources_id: resource.id
        });

        addResourcReferenceCounte(resource.id);

        fileData = {
          fullPath: joinPath(body.folderPath, fileName),
          name: fileName,
          size: resource.size,
          type: 'file',
          cover: createCoverUrl(cover),
          createTime: (Date.now() / 1000) * 1000,
          modifiedTime: (Date.now() / 1000) * 1000
        };
      })();

      res.json(
        defineResponseBody({
          data: { isComplete: true, folderPath: body.folderPath, file: fileData },
          msg: '创建成功'
        })
      );
    } else {
      const partSize = Math.max(1 * 1024 * 1024, body.partSize || 0);
      const result = await useAdmin().initMultipartUpload(
        `storage/${locals.user.account}/${body.fileHash}-${Date.now()}-${body.fileName}`
      );

      let uploadUrls: string[] = [];
      for (let i = 1; i <= Math.ceil(body.fileSize / partSize); i++) {
        uploadUrls.push(
          // @ts-ignore
          await useAdmin().signatureUrlV4(
            'PUT',
            1 * 60 * 60,
            {
              headers: {
                'Content-Type': 'application/octet-stream'
              },
              queries: {
                partNumber: i,
                uploadId: result.uploadId
              }
            },
            result.name
          )
        );
      }
      uploadUrls.push(
        // @ts-ignore
        await useAdmin().signatureUrlV4(
          'POST',
          1 * 60 * 60,
          {
            headers: {},
            queries: {
              uploadId: result.uploadId
            }
          },
          result.name
        )
      );
      res.json(
        defineResponseBody({ data: { isComplete: false, folderPath: body.folderPath, uploadUrls } })
      );
    }
  }
});

/**
 * @description: 检查参数
 * @param {CreateFileRequestBody} body body
 */
function checkParams(body: CreateFileRequestBody) {
  if (!body.fileHash || !body.fileSize || !body.fileName || !body.folderPath || !body.uploadMode) {
    throw { code: responseCode.error, msg: '缺少参数' };
  }

  if (!testFilename(body.fileName)) {
    throw { code: responseCode.error, msg: '文件名不合法' };
  }
}

/**
 * @description: 查询资源
 */
function selectResource(params: Pick<ResourcesTable, 'hash' | 'size'>) {
  type SQLResult = Pick<ResourcesTable, 'id' | 'size' | 'object'>;

  const sql = `SELECT id, size, object FROM resources WHERE hash = $hash AND size = $size;`;
  return useDatabase().prepare<typeof params, SQLResult>(sql).get(params);
}

/**
 * @description: 创建文件
 */
function createFile(
  params: Pick<DirectorysTable, 'path' | 'name' | 'size' | 'cover' | 'resources_id'>
) {
  const sql = `INSERT INTO directorys (path, name, size, type, cover, resources_id) VALUES ($path, $name, $size, 'file', $cover, $resources_id);`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}

/**
 * @description: 增加资源引用计数
 */
function addResourcReferenceCounte(params: ResourcesTable['id']) {
  const sql = `UPDATE resources SET reference_count = reference_count + 1, modified_date = datetime (CURRENT_TIMESTAMP, 'localtime') WHERE id = ?;`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}

/**
 * @description: 获取文件封面
 * @param {string} name 文件名称
 * @param {string} object oss object
 * @return {string} 封面地址
 */
function getFileCover(name: string, object: string): string {
  const suffix = name.match(/\.(\w+)$/)?.[1].toLocaleLowerCase();

  switch (suffix) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
      return object;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
    case 'iso':
      return '/static/cover/compressedFile.png';
    case 'exe':
      return '/static/cover/executionFile.png';
    case 'pdf':
      return '/static/cover/pdfFile.png';
    default:
      return '/static/cover/docmentFile.png';
  }
}

/**
 * @description: 获取文件名称
 * @param {string} path 路径
 * @param {string} name 名称
 * @return {string} 文件名称
 */
function getFileName(path: string, name: string): string {
  const sql = `SELECT id FROM directorys WHERE type = 'file' AND path = $path AND name = $name;`;
  const isExist = useDatabase()
    .prepare<Pick<DirectorysTable, 'path' | 'name'>, Pick<DirectorysTable, 'id'>>(sql)
    .get({ path, name });
  const pos = name.lastIndexOf('.');

  if (isExist) {
    if (pos === -1) {
      name = `${name}_${Date.now()}`;
    } else {
      name = `${name.slice(0, pos)}_${Date.now()}${name.slice(pos)}`;
    }
  }

  return name;
}

/**
 * @description: 创建封面url
 * @param {string} path 路径
 * @return {string} 封面url
 */
function createCoverUrl(path: string): string {
  if (path.startsWith('/static/cover')) {
    return `http://14.103.48.37${path}`;
  } else {
    return useAdmin().signatureUrl(path, { expires: 60 });
  }
}
