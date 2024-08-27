// 完成分片接口-请求body
export type CompleteMultipartRequestBody = {
  object: string; // object名称
  fileHash: string; // 文件hash
  uploadId: string; // 上传id
  partList: {
    number: number;
    etag: string;
  }[]; // 分片数据列表
};

// 完成分片接口-请求query
export type CompleteMultipartRequestQuery = void;

// 完成分片接口-响应body
export type CompleteMultipartResponseBody = ResponseBody<string>;
