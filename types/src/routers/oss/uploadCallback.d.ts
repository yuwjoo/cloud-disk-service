export type UploadCallbackRequestBody = {
  token: string; // token
  object: string; // oss object
  name: string; // 文件名称
  size: number; // 文件大小
  type: string; // 文件类型
  hash: string; // 文件hash
}; // 请求body

export type UploadCallbackResponseData = {
  resourceFlag: string; // 资源标识
}; // 响应数据

export {};
