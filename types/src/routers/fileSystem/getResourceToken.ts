// 获取资源token接口-请求body
export type GetResourceTokenRequestBody = void;

// 获取资源token接口-请求query
export type GetResourceTokenRequestQuery = {
  fileHash: string; // 文件hash
};

// 获取资源token接口-响应body
export type GetResourceTokenResponseBody = ResponseBody<string>; // 资源token

// 资源标识负载
export type ResourceFlagPayload = {
  token: string; // token
  resourceId: number; // 资源id
};
