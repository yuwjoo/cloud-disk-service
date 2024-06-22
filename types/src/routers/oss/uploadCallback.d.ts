export type UploadCallbackRequestBody = {
  token: string; // token
  folderId?: number; // 文件夹id
  object: string; // oss object
  name: string; // 文件名称
  size: number; // 文件大小
  type: string; // 文件类型
  hash: string; // 文件hash
}; // 请求body

export type UploadCallbackResponseData = void; // 响应数据

export {};
