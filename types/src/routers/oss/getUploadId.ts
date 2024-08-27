// 获取上传id接口-请求body
export type GetUploadIdRequestBody = void;

// 获取上传id接口-请求query
export type GetUploadIdRequestQuery = {
  fileHash: string; // 文件hash
  fileName: string; // 文件名
  mimeType: string; // 文件类型
};

// 获取上传id接口-响应body
export type GetUploadIdResponseBody = ResponseBody<{
  uploadId: string; // 上传id
  object: string; // object名称
}>;
