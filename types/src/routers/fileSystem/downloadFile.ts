import type { DirectorysTable } from 'types/src/utils/database';

// 下载文件接口-请求body
export type DownloadFileRequestBody = void;

// 下载文件接口-请求query
export type DownloadFileRequestQuery = {
  fileId?: DirectorysTable['id']; // 文件id
};

// 下载文件接口-响应body
export type DownloadFileResponseBody = ResponseBody<string>;
