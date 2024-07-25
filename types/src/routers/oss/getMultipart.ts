// 获取分片上传接口-请求body
export type GetMultipartRequestBody = void;

// 获取分片上传接口-请求query
export type GetMultipartRequestQuery = {
  uploadId: string; // 上传id
  startPartNumber: number; // 起始分片序号
  fileHash: string; // 文件hash
  fileSize: number; // 文件大小
  fileName: string; // 文件名
  mimeType: string; // 文件类型
  partSize: number; // 分片大小
};

// 获取分片上传接口-响应body
export type GetMultipartResponseBody = ResponseBody<{
  partSize: number; // 分片大小
  startPartNumber: number; // 起始分片序号
  multipartUrls: string[]; // 分片上传的url
  nextMultipartUrl?: string; // 继续分片上传的url
  submitMultipartUrl?: string; // 提交分片上传的url
}>;
