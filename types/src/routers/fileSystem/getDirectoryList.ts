import type { DirectorysTable } from 'types/src/utils/database';

// 获取目录列表接口-请求body
export type GetDirectoryListRequestBody = void;

// 获取目录列表接口-请求query
export type GetDirectoryListRequestQuery = {
  folderPath?: string; // 文件夹路径
};

// 获取目录列表接口-响应body
export type GetDirectoryListResponseBody = ResponseBody<{
  folderPath: string; // 文件夹路径
  list: {
    fullPath: string; // 完整路径
    name: DirectorysTable['name']; // 名称
    size: DirectorysTable['size']; // 大小
    type: DirectorysTable['type']; // 类型
    cover: DirectorysTable['cover']; // 封面
    createTime: number; // 创建日期时间戳
    modifiedTime: number; // 修改日期时间戳
  }[];
}>;
