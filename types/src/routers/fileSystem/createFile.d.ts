export type CreateFileRequestBody = {
  folderUUID?: string; // 所属文件夹uuid
  name: string; // 文件名称
  ossPath: string; // oss文件路径
  size: number; // 文件大小
  type: string; // 文件类型
  hash: string; // hash值
}; // 请求body

export type CreateFileResponseData = void; // 响应数据

export {};
