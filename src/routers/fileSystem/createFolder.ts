import type { DirectorysTable } from 'types/src/utils/database';
import type {
  CreateFolderRequestBody,
  CreateFolderRequestQuery,
  CreateFolderResponseBody
} from 'types/src/routers/fileSystem/createFolder';
import { defineResponseBody, defineRoute, responseCode } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import { testFilename } from '@/utils/rules';
import { mergePath } from '@/utils/utils';

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
      res.json(defineResponseBody({ code: responseCode.error, msg: '缺少参数' }));
      return;
    }

    if (!testFilename(query.folderName)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '文件夹名不合法' }));
      return;
    }

    const rootFolderRow = selectFolderById(locals.user.root_folder_id);
    let parentFolderRow;

    if (query.parentFolderId) {
      parentFolderRow = selectFolderById(query.parentFolderId);
    } else {
      parentFolderRow = rootFolderRow;
    }

    if (!rootFolderRow || !parentFolderRow) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '文件夹不存在' }));
      return;
    }

    const rootFolderPath = mergePath(rootFolderRow.parent_path, rootFolderRow.name);
    const parentFolderPath = mergePath(parentFolderRow.parent_path, parentFolderRow.name);

    if (!parentFolderPath.startsWith(rootFolderPath)) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '无权限访问' }));
      return;
    }

    if (selectFolder({ parent_path: parentFolderPath, name: query.folderName })) {
      res.json(defineResponseBody({ code: responseCode.error, msg: '文件夹名重复' }));
      return;
    }

    const { lastInsertRowid } = createFolder({
      parent_path: parentFolderPath,
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
          mimeType: null,
          parentFolderId: parentFolderRow.id,
          createTime: (Date.now() / 1000) * 1000,
          modifiedTime: (Date.now() / 1000) * 1000
        },
        msg: '创建成功'
      })
    );
  }
});

/**
 * @description: 根据id查询文件夹
 */
function selectFolderById(
  params: DirectorysTable['id']
): Pick<DirectorysTable, 'id' | 'parent_path' | 'name'> | undefined {
  const sql = `SELECT id, parent_path, name FROM directorys WHERE type = 'folder' AND id = ?;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFolderById>>(sql).get(params);
}

/**
 * @description: 查询文件夹
 */
function selectFolder(
  params: Pick<DirectorysTable, 'parent_path' | 'name'>
): Pick<DirectorysTable, 'id'> | undefined {
  const sql = `SELECT id FROM directorys WHERE type = 'folder' AND parent_path = $parent_path AND name = $name;`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectFolder>>(sql).get(params);
}

/**
 * @description: 创建文件夹
 */
function createFolder(params: Pick<DirectorysTable, 'parent_path' | 'name' | 'create_account'>) {
  const sql = `INSERT INTO directorys (parent_path, name, type, create_account) VALUES ($parent_path, $name, 'folder', $create_account);`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
