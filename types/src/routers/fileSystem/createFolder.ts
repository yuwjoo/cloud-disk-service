import type { DirectorysTable } from 'types/src/utils/database';

// 创建文件夹接口-请求body
export type CreateFolderRequestBody = void;

// 创建文件夹接口-请求query
export type CreateFolderRequestQuery = {
  folderPath?: Required<DirectorysTable['path']>; // 文件夹路径
  name: DirectorysTable['name']; // 名称
};

// 创建文件夹接口-响应body
export type CreateFolderResponseBody = ResponseBody<{
  folderPath: string; // 文件夹路径
  folder: {
    fullPath: string; // 完整路径
    name: DirectorysTable['name']; // 名称
    size: DirectorysTable['size']; // 大小
    type: DirectorysTable['type']; // 类型
    cover: DirectorysTable['cover']; // 封面
    createTime: number; // 创建日期时间戳
    modifiedTime: number; // 修改日期时间戳
  };
}>;
