export type GetResourceFlagRequestQuery = {
  fileHash: string; // 文件hash
  fileSize: number; // 文件大小
}; // 请求参数

export type GetResourceFlagResponseData = {
  resourceFlag?: string; // 资源标识
}; // 响应数据

export type ResourceFlag = {
  token: string; // token
  resourceId: number; // 资源id
}; // 资源标识

export {};
