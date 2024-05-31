export type ResetPasswordRequestBody = {
  account: string; // 账号
  oldPassword: string; // 旧密码
  newPassword: string; // 新密码
}; // 请求body

export type ResetPasswordResponseData = void; // 响应数据

export {};
