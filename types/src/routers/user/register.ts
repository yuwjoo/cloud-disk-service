// 注册接口-请求body
export type RegisterRequestBody = {
  nickname: string; // 昵称
  account: string; // 账号
  password: string; // 密码
};

// 注册接口-请求query
export type RegisterRequestQuery = void;

// 注册接口-响应body
export type RegisterResponseBody = ResponseBody<void>;
