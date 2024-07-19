import type { DirectorysTable } from 'types/src/utils/database';

// 创建文件接口-请求body
export type CreateFileRequestBody = {
  fileHash: string; // 文件hash
  fileSize: number; // 文件大小
  fileName: string; // 文件名
  folderPath: string; // 文件夹路径
  uploadMode: 'put' | 'part'; // 上传模式，put: 简单上传，part: 分片上传
};

// 创建文件接口-请求query
export type CreateFileRequestQuery = void;

// 创建文件接口-响应body
export type CreateFileResponseBody = ResponseBody<{
  folderPath: string; // 文件夹路径
  file: {
    fullPath: string; // 完整路径
    name: DirectorysTable['name']; // 名称
    size: DirectorysTable['size']; // 大小
    type: DirectorysTable['type']; // 类型
    cover: DirectorysTable['cover']; // 封面
    createTime: number; // 创建日期时间戳
    modifiedTime: number; // 修改日期时间戳
  };
}>;
