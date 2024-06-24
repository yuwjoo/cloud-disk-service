// 重置密码接口-请求body
export type ResetPasswordRequestBody = {
  account: string; // 账号
  oldPassword: string; // 旧密码
  newPassword: string; // 新密码
};

// 重置密码接口-请求query
export type ResetPasswordRequestQuery = void;

// 重置密码接口-响应body
export type ResetPasswordResponseBody = ResponseBody<void>;
