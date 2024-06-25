import type { DirectorysTable } from 'types/src/utils/database';

// 获取目录列表接口-请求body
export type GetDirectoryListRequestBody = void;

// 获取目录列表接口-请求query
export type GetDirectoryListRequestQuery = {
  folderId?: number; // 文件夹id
};

// 获取目录列表接口-响应body
export type GetDirectoryListResponseBody = ResponseBody<{
  folderPathList: string; // 文件夹路径列表
  directoryList: {
    id: DirectorysTable['id']; // id
    name: DirectorysTable['name']; // 名称
    size: DirectorysTable['size']; // 大小
    type: DirectorysTable['type']; // 类型
    mimeType: DirectorysTable['mime_type']; // mime类型
    createTime: number; // 创建日期时间戳
    modifiedTime: number; // 修改日期时间戳
  }[];
}>;
