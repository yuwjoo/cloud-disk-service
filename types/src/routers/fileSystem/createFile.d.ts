import type { DirectorysTable } from 'types/src/utils/database';

// 创建文件接口-请求body
export type CreateFileRequestBody = void;

// 创建文件接口-请求query
export type CreateFileRequestQuery = {
  resourceFlag: string; // 资源标识
  fileName: DirectorysTable['name']; // 文件名
  folderId?: DirectorysTable['id']; // 文件夹id
};

// 创建文件接口-响应body
export type CreateFileResponseBody = ResponseBody<{
  folderId: number; // 文件夹id
  fileData: {
    id: DirectorysTable['id']; // id
    name: DirectorysTable['name']; // 名称
    size: DirectorysTable['size']; // 大小
    type: DirectorysTable['type']; // 类型
    createTime: number; // 创日期时间戳
    modifiedTime: number; // 修改日期时间戳
  };
}>;
