export type StsRequestQuery = void; // 请求参数

export type StsResponseData = {
  AccessKeyId: string; // AccessKeyId
  AccessKeySecret: string; // AccessKeySecret
  SecurityToken: string; // SecurityToken
  Expiration: string; // 过期时间
  uploadPath: string; // 上传路径
}; // 响应数据

export {};
