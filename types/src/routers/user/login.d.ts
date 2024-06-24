// 登录接口-请求body
export type LoginRequestBody = {
  account: string; // 账号
  password: string; // 密码
  temporary: boolean; // 是否临时登录
};

// 登录接口-请求query
export type LoginRequestQuery = void;

// 登录接口-响应body
export type LoginResponseBody = ResponseBody<{
  token: string; // token
  user: {
    nickname: string; // 昵称
    account: string; // 账号
    avatar: string | null; // 头像
    roleCode: string; // 角色code
    roleName: string; // 角色名称
  };
}>;
