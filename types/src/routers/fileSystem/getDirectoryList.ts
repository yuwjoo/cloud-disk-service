import type { DirectorysTable } from 'types/src/utils/database';

export type GetDirectoryListRequestQuery = {
  folderId?: DirectorysTable['id']; // 文件夹id
}; // 请求参数

export type GetDirectoryListResponseData = {
  folderId: number; // 文件夹id
  list: {
    id: DirectorysTable['id']; // id
    name: DirectorysTable['name']; // 名称
    size: DirectorysTable['size']; // 大小
    type: DirectorysTable['type']; // 类型
    createTime: number; // 创日期时间戳
    modifiedTime: number; // 修改日期时间戳
  }[];
}; // 响应数据

export {};
