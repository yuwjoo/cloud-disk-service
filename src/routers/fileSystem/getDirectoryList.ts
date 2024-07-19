import type { DirectorysTable } from 'types/src/utils/database';
import type {
  GetDirectoryListRequestBody,
  GetDirectoryListRequestQuery,
  GetDirectoryListResponseBody
} from 'types/src/routers/fileSystem/getDirectoryList';
import { defineResponseBody, defineRoute } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { joinPath } from '@/utils/utils';
import { useAdmin } from '@/utils/oss';
// import singV4 from '@/utils/signV4';

// console.log(singV4("get", 900, {headers: "host": }))
// http://yuwjoo-private-cloud-storage.oss-cn-shenzhen.aliyuncs.com/storage/yuwjoo/2024-07-18/10H59M37S/1721271617220-%E7%BB%98%E5%9B%BE2.jpg

// console.log(
//   useAdmin().signatureUrlV4(
//     'POST',
//     600,
//     {
//       queries: {
//         uploads: null
//       }
//     },
//     'storage/yuwjoo/2024-06-25/15H49M27S/example1.txt'
//   )
// );

/**
 * @description: 获取目录列表接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<GetDirectoryListRequestBody, GetDirectoryListRequestQuery>,
    res: RouteResponse<GetDirectoryListResponseBody>
  ) => {
    const { query, locals } = req;
    const folderPath = query.folderPath || '/';
    const innerFolderPath = joinPath(locals.user.root_path, folderPath);
    const directoryRows = selectDirectorys({ path: innerFolderPath });
    const list = directoryRows.map((directory) => ({
      ...directory,
      fullPath: joinPath(folderPath, directory.name),
      cover: createCoverUrl(directory.cover),
      createTime: new Date(directory.create_date).getTime(),
      modifiedTime: new Date(directory.modified_date).getTime()
    }));

    res.json(defineResponseBody({ data: { folderPath, list } }));
  }
});

/**
 * @description: 查询目录列表
 */
function selectDirectorys(
  params: Pick<DirectorysTable, 'path'>
): Pick<DirectorysTable, 'name' | 'size' | 'type' | 'cover' | 'create_date' | 'modified_date'>[] {
  const sql = `SELECT name, size, type, cover, create_date, modified_date FROM directorys WHERE path = $path ORDER BY type DESC, name ASC;`;
  return useDatabase().prepare<typeof params>(sql).all(params) as any;
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
    return useAdmin().signatureUrl(path, { expires: 60, process: 'image/resize,w_80' });
  }
}
