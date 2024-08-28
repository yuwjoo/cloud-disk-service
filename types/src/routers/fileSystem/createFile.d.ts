import type { DirectorysTable } from 'types/src/utils/database';

// 创建文件接口-请求body
export type CreateFileRequestBody = {
  folderPath: string; // 文件夹路径
  fileName: string; // 文件名
  resourceToken: string; // 资源token
};

// 创建文件接口-请求query
export type CreateFileRequestQuery = void;

// 创建文件接口-响应body
export type CreateFileResponseBody = ResponseBody<{
  folderPath: string; // 文件夹路径
  file: {
    fullPath: string; // 完整路径
    name: string; // 名称
    size: number; // 大小
    type: 'file'; // 类型
    cover: string; // 封面
    createTime: number; // 创建日期时间戳
    modifiedTime: number; // 修改日期时间戳
  };
}>;
