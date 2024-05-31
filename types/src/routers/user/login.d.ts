export interface LoginRequestBody {
  account: string; // 账号
  password: string; // 密码
  temporary: boolean; // 是否临时登录
} // 请求body

export interface LoginResponseData {
  token: string; // token
  user: {
    nickname: string; // 昵称
    account: string; // 账号
    avatar: string | null; // 头像
    roleCode: string; // 角色code
    roleName: string; // 角色名称
  };
} // 响应数据

export {};
