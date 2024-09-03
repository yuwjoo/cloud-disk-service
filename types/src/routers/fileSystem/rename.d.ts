import type { DirectorysTable } from 'types/src/utils/database';

// 重命名接口-请求body
export type RenameRequestBody = void;

// 重命名接口-请求query
export type RenameRequestQuery = {
  filePath: DirectorysTable['path']; // 文件路径
  newName: string; // 新文件名
};

// 重命名接口-响应body
export type RenameResponseBody = ResponseBody<void>;
