import type { DirectorysTable } from 'types/src/utils/database';

export type CreateFileRequestQuery = {
  resourceId: DirectorysTable['resources_id']; // 资源id
  fileName: DirectorysTable['name']; // 文件名
  folderId: DirectorysTable['parent_id']; // 文件夹id
}; // 请求参数

export type CreateFileResponseData = Pick<
  DirectorysTable,
  'id' | 'name' | 'size' | 'type' | 'create_date' | 'modified_date' | 'parent_id'
>; // 响应数据

export {};
