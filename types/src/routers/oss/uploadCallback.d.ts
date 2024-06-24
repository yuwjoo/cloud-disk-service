// oss上传回调接口-请求body
export type UploadCallbackRequestBody = {
  token: string; // token
  object: string; // oss object
  name: string; // 文件名称
  size: number; // 文件大小
  type: string; // 文件类型
  hash: string; // 文件hash
};

// oss上传回调接口-请求query
export type UploadCallbackRequestQuery = void;

// oss上传回调接口-响应body
export type UploadCallbackResponseBody = ResponseBody<{
  resourceFlag: string; // 资源标识
}>;
