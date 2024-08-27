// 获取分片接口-请求body
export type GetMultipartsRequestBody = {
  uploadId: string; // 上传id
  object: string; // object名称
  partNumbers: number[]; // 分片序号列表
  mimeType: string; // 文件类型
};

// 获取分片接口-请求query
export type GetMultipartsRequestQuery = void;

// 获取分片接口-响应body
export type GetMultipartsResponseBody = ResponseBody<MultipartPart[]>;

// 分片数据
export type MultipartPart = {
  number: number; // 序号
  url: string; // 上传地址
  expire: number; // 过期时间戳
};
