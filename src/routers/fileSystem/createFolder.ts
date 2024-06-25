import type { DirectorysTable } from 'types/src/utils/database';
import type {
  CreateFolderRequestBody,
  CreateFolderRequestQuery,
  CreateFolderResponseBody
} from 'types/src/routers/fileSystem/createFolder';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';

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

    if (!query.folderName) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '缺少文件夹名称' }));
      return;
    }

    if (!/^[^"*<>?\\|/:]+$/.test(query.folderName)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '非法文件夹名称' }));
      return;
    }

    const parentFolderPath = query.parentFolderPath || locals.user.root_folder_path;

    if (!parentFolderPath.startsWith(locals.user.root_folder_path)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '无权限访问' }));
      return;
    }

    if (selectFolder({ folder_path: parentFolderPath, name: query.folderName })) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '已存在同名文件夹' }));
      return;
    }

    const { lastInsertRowid } = createFolder({
      folder_path: parentFolderPath,
      name: query.folderName,
      create_account: locals.user.account
    });

    res.json(
      defineResponseBody({
        data: {
          id: lastInsertRowid as number,
          name: query.folderName,
          size: 0,
          type: 'folder',
          parentFolderPath,
          createTime: (Date.now() / 1000) * 1000,
          modifiedTime: (Date.now() / 1000) * 1000
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
  params: Pick<DirectorysTable, 'folder_path' | 'name'>
): Pick<DirectorysTable, 'id'> | undefined {
  const sql = `SELECT id FROM directorys WHERE type = 'folder' AND folder_path = $folder_path AND name = $name;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFolder>>(sql).get(params);
}

/**
 * @description: 创建文件夹
 */
function createFolder(params: Pick<DirectorysTable, 'folder_path' | 'name' | 'create_account'>) {
  const sql = `INSERT INTO directorys (folder_path, name, create_account) VALUES ($folder_path, $name, $create_account);`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
