export type CreateFileRequestQuery = {
  folderId: string; // 文件夹id
  name: string; // 文件名
  size: number; // 文件大小
  ossPath: string; // oss文件路径
}; // 请求参数

export type CreateFileResponseData = void; // 响应数据

export {};
