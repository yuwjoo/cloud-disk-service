// oss上传回调接口-请求body
export type UploadCallbackRequestBody = {
  token: string; // token
  object: string; // oss object
  size: number; // 大小
  mimeType?: string; // mime类型
  hash: string; // hash
};

// oss上传回调接口-请求query
export type UploadCallbackRequestQuery = void;

// oss上传回调接口-响应body
export type UploadCallbackResponseBody = ResponseBody<{
  resourceFlag: string; // 资源标识
}>;
