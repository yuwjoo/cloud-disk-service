import type { DirectorysTable } from 'types/src/utils/database';

export type DownloadFileRequestQuery = {
  fileId?: DirectorysTable['id']; // 文件id
}; // 请求参数

export type DownloadFileResponseData = string; // 响应数据

export {};
