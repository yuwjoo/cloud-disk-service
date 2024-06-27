import type { DirectorysTable } from 'types/src/utils/database';

// 创建文件接口-请求body
export type CreateFileRequestBody = void;

// 创建文件接口-请求query
export type CreateFileRequestQuery = {
  parentFolderId?: DirectorysTable['id']; // 父级文件夹id
  filename: DirectorysTable['name']; // 文件名称
  resourceFlag: string; // 资源标识
};

// 创建文件接口-响应body
export type CreateFileResponseBody = ResponseBody<{
  id: DirectorysTable['id']; // id
  name: DirectorysTable['name']; // 名称
  size: DirectorysTable['size']; // 大小
  type: DirectorysTable['type']; // 类型
  mimeType: DirectorysTable['mime_type']; // mime类型
  parentFolderId: DirectorysTable['id']; // 父级文件夹id
  createTime: number; // 创建日期时间戳
  modifiedTime: number; // 修改日期时间戳
}>;
