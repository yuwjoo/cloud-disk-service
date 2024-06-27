import type { DirectorysTable } from 'types/src/utils/database';

// 创建文件夹接口-请求body
export type CreateFolderRequestBody = void;

// 创建文件夹接口-请求query
export type CreateFolderRequestQuery = {
  parentFolderId?: Required<DirectorysTable['id']>; // 父级文件夹id
  folderName: DirectorysTable['name']; // 文件夹名称
};

// 创建文件夹接口-响应body
export type CreateFolderResponseBody = ResponseBody<{
  id: DirectorysTable['id']; // id
  name: DirectorysTable['name']; // 名称
  size: DirectorysTable['size']; // 大小
  type: DirectorysTable['type']; // 类型
  mimeType: DirectorysTable['mime_type']; // mime类型
  parentFolderId: DirectorysTable['id']; // 父级文件夹id
  createTime: number; // 创建日期时间戳
  modifiedTime: number; // 修改日期时间戳
}>;
