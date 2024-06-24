// sts接口-请求body
export type STSRequestBody = void;

// sts接口-请求query
export type STSRequestQuery = void;

// sts接口-响应body
export type STSResponseBody = ResponseBody<{
  AccessKeyId: string; // AccessKeyId
  AccessKeySecret: string; // AccessKeySecret
  SecurityToken: string; // SecurityToken
  Expiration: string; // 过期时间
  uploadPath: string; // 上传路径
}>;
