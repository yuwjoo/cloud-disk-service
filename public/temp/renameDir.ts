import type { Request, Response } from 'express';
import type { RenameDirReqParams, RenameDirResData } from 'types/src/routers/fileSystem/renameDir';
import type { ResponseBody } from 'types/src/utils/interface';
import type { ResLocals } from 'types/src/middlewares/authorization';
import { responseCode, useResponseBody } from '@/utils/interface';
import { useDefineApi } from '@/utils/interface';
import { useDatabase } from '@/utils/database';
import type { DirectoriesTable } from 'types/src/utils/database';

export default useDefineApi('get', renameDir);

const selectDirectorieById = useDatabase().prepare<
  { id: number },
  Pick<DirectoriesTable, 'owner_account' | 'parent_id'>
>(`SELECT owner_account, parent_id FROM directories WHERE id = $id;`); // 查询指定id目录

const selectDuplicateDirectory = useDatabase().prepare<
  {
    name: string;
    parent_id: number | null;
    not_id: number;
  },
  DirectoriesTable
>(`SELECT * FROM directories WHERE parent_id = $parent_id AND id != $not_id AND name = $name;`); // 查询重复名称目录

const updateDirectorieName = useDatabase().prepare<{
  name: string;
  id: number;
}>(`UPDATE directories SET name = $name WHERE id = $id`); // 修改目录名称

/**
 * @description: 重命名目录接口
 * @param {Request} req 请求
 * @param {Response} res 响应
 */
async function renameDir(
  req: Request<any, any, any, RenameDirReqParams>,
  res: Response<ResponseBody<RenameDirResData | undefined>, ResLocals>
) {
  const params = req.query;

  const directorieData = selectDirectorieById.get({ id: params.dirId }); // 查询当前id对应目录

  if (!directorieData) {
    res.json(useResponseBody({ code: responseCode.error, msg: '修改失败，目录不存在' }));
    return;
  } else if (directorieData.owner_account !== res.locals.user.account) {
    res.json(useResponseBody({ code: responseCode.error, msg: '修改失败，无权限操作' }));
    return;
  }

  const duplicateDirectory = selectDuplicateDirectory.get({
    name: params.name,
    parent_id: directorieData.parent_id || null,
    not_id: params.dirId
  }); // 查询重复名称目录

  if (duplicateDirectory) {
    res.json(useResponseBody({ code: responseCode.error, msg: '修改失败，目录名重复' }));
    return;
  }

  updateDirectorieName.run({ id: params.dirId, name: params.name }); // 更新目录名称

  res.json(useResponseBody({ msg: '修改成功' }));
}
