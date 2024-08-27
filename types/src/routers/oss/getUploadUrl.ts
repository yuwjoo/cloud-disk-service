// 获取分片上传接口-请求body
export type GetUploadUrlRequestBody = void;

// 获取分片上传接口-请求query
export type GetUploadUrlRequestQuery = {
  fileHash: string; // 文件hash
  fileName: string; // 文件名
  mimeType: string; // 文件MIME类型
};

// 获取分片上传接口-响应body
export type GetUploadUrlResponseBody = ResponseBody<{
  uploadUrl: string; // 上传url
  expire: number; // 过期时间戳
}>;
