import type { DirectorysTable, ResourcesTable } from 'types/src/utils/database';
import type {
  CreateFileRequestBody,
  CreateFileRequestQuery,
  CreateFileResponseBody
} from 'types/src/routers/fileSystem/createFile';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { testFilename } from '@/utils/rules';
import { joinPath, toDBDate } from '@/utils/utils';
import { generateCoverUrl, generateFileCover } from '@/utils/file';
import { decrypt } from '@/utils/secure';
import type { ResourceFlagPayload } from 'types/src/routers/fileSystem/getResourceToken';

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
    const resourceToken = JSON.parse(decrypt(params.resourceToken)) as ResourceFlagPayload;
    const resourceRow = findResource(resourceToken);
    const file = createFile(params, req.locals, resourceRow!);

    res.json(defineResponseBody({ data: { folderPath: params.folderPath, file } }));
  }
});

/**
 * @description: 处理参数
 * @param {CreateFileRequestBody} body body
 * @return {CreateFileRequestBody} 处理后的参数
 */
function handleParams(body: CreateFileRequestBody): CreateFileRequestBody {
  if (!body.folderPath || !body.fileName || !body.resourceToken) {
    throw { code: responseCode.error, msg: '缺少参数' };
  }

  if (!testFilename(body.fileName)) {
    throw { code: responseCode.error, msg: '文件名不合法' };
  }

  return body;
}

/**
 * @description: 寻找资源
 * @param {ResourceFlagPayload} params 参数
 * @return {Pick<ResourcesTable, 'id' | 'size' | 'object'> | undefined} 查询结果
 */
function findResource(
  params: ResourceFlagPayload
): Pick<ResourcesTable, 'id' | 'size' | 'object'> | undefined {
  return useDatabase()
    .prepare<
      Pick<ResourcesTable, 'id'>,
      Pick<ResourcesTable, 'id' | 'size' | 'object'> | undefined
    >(
      `
        SELECT id, size, object 
        FROM resources 
        WHERE id = $id;
      `
    )
    .get({ id: params.resourceId });
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
