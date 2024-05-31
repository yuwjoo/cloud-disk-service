import type { FilesTable, FoldersTable } from 'types/src/utils/database';

export type BatchCreateFileRequestBody = {
  folderId: FoldersTable['id']; // 文件夹id
  fileList: {
    name: FilesTable['name']; // 文件名
    size: FilesTable['size']; // 文件大小
    ossPath: FilesTable['oss_path']; // oss文件路径
  }[];
}; // 请求body

export type BatchCreateFileResponseData = void; // 响应数据

export {};
