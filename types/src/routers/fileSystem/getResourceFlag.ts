// 获取资源标识接口-请求body
export type GetResourceFlagRequestBody = void;

// 获取资源标识接口-请求query
export type GetResourceFlagRequestQuery = {
  fileHash: string; // 文件hash
  fileSize: number; // 文件大小
};

// 获取资源标识接口-响应body
export type GetResourceFlagResponseBody = ResponseBody<{
  resourceFlag?: string; // 资源标识
}>;

// 资源标识负载
export type ResourceFlagPayload = {
  token: string; // token
  resourceId: number; // 资源id
};
