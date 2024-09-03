import type { DirectorysTable } from 'types/src/utils/database';

// 删除文件接口-请求body
export type DeleteFilesRequestBody = {
  filePaths: DirectorysTable['path'][]; // 文件路径列表
};

// 删除文件接口-请求query
export type DeleteFilesRequestQuery = void;

// 删除文件接口-响应body
export type DeleteFilesResponseBody = ResponseBody<void>;
