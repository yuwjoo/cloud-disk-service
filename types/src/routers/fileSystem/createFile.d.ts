import type { DirectorysTable } from 'types/src/utils/database';

// 创建文件接口-请求body
export type CreateFileRequestBody = {
  folderPath: string; // 文件夹路径
  fileHash: string; // 文件hash
  fileSize: number; // 文件大小
  fileName: string; // 文件名
  mimeType: string; // 文件类型
  uploadMode: 'simple' | 'multipart'; // 上传模式， simple: 简单上传，multipart: 分片上传
  partSize?: number; // 分片上传时，每个分片的大小
  forceUpload?: boolean; // 跳过重复文件检查逻辑，强制上传该文件
};

// 创建文件接口-请求query
export type CreateFileRequestQuery = void;

// 创建文件接口-响应body
export type CreateFileResponseBody = ResponseBody<{
  folderPath: string; // 文件夹路径
  file?: {
    fullPath: string; // 完整路径
    name: string; // 名称
    size: number; // 大小
    type: 'file'; // 类型
    cover: string; // 封面
    createTime: number; // 创建日期时间戳
    modifiedTime: number; // 修改日期时间戳
  };
  upload: {
    mode?: 'simple' | 'multipart'; // 上传模式， simple: 简单上传，multipart: 分片上传
    simpleUrl?: string; // 简单上传的url
    partSize?: number; // 分片大小
    startPartNumber?: number; // 起始分片序号
    multipartUrls?: string[]; // 分片上传的url
    nextMultipartUrl?: string; // 继续请求分片上传的url
    submitMultipartUrl?: string; // 提交分片上传的url
  };
}>;
