import type { DirectorysTable } from 'types/src/utils/database';

// 下载文件接口-请求body
export type DownloadFileRequestBody = void;

// 下载文件接口-请求query
export type DownloadFileRequestQuery = {
  filePath: DirectorysTable['path']; // 文件路径
};

// 下载文件接口-响应body
export type DownloadFileResponseBody = ResponseBody<string>;
