import type { DirectorysTable } from 'types/src/utils/database';
import type {
  CreateFolderRequestBody,
  CreateFolderRequestQuery,
  CreateFolderResponseBody
} from 'types/src/routers/fileSystem/createFolder';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { testFilename } from '@/utils/rules';
import { joinPath } from '@/utils/utils';
import { useAdmin } from '@/utils/oss';

/**
 * @description: 创建文件夹接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<CreateFolderRequestBody, CreateFolderRequestQuery>,
    res: RouteResponse<CreateFolderResponseBody>
  ) => {
    const { query, locals } = req;

    if (!query.name) {
      throw { code: responseCode.error, msg: '缺少参数' };
    }

    if (!testFilename(query.name)) {
      throw { code: responseCode.error, msg: '文件夹名不合法' };
    }

    const folderPath = query.folderPath || '/';
    const innerFolderPath = joinPath(locals.user.root_path, folderPath);
    const cover = '/static/cover/folder.png';

    if (selectFolder({ path: innerFolderPath, name: query.name })) {
      throw { code: responseCode.error, msg: '文件夹名重复' };
    }

    createFolder({
      path: innerFolderPath,
      name: query.name,
      cover
    });

    res.json(
      defineResponseBody({
        data: {
          folderPath,
          folder: {
            fullPath: joinPath(folderPath, query.name),
            name: query.name,
            size: 0,
            type: 'folder',
            cover: createCoverUrl(cover),
            createTime: (Date.now() / 1000) * 1000,
            modifiedTime: (Date.now() / 1000) * 1000
          }
        },
        msg: '创建成功'
      })
    );
  }
});

/**
 * @description: 查询文件夹
 */
function selectFolder(
  params: Pick<DirectorysTable, 'path' | 'name'>
): Pick<DirectorysTable, 'id'> | undefined {
  const sql = `SELECT id FROM directorys WHERE type = 'folder' AND path = $path AND name = $name;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFolder>>(sql).get(params);
}

/**
 * @description: 创建文件夹
 */
function createFolder(params: Pick<DirectorysTable, 'path' | 'name' | 'cover'>) {
  const sql = `INSERT INTO directorys (path, name, type, cover) VALUES ($path, $name, 'folder', $cover);`;
  return useDatabase().prepare<typeof params>(sql).run(params);
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
