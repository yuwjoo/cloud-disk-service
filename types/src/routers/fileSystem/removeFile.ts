import type { DirectorysTable } from 'types/src/utils/database';

// 删除文件接口-请求body
export type RemoveFileRequestBody = void;

// 删除文件接口-请求query
export type RemoveFileRequestQuery = {
  fileId: DirectorysTable['id']; // 文件id
};

// 删除文件接口-响应body
export type RemoveFileResponseBody = ResponseBody<void>;
