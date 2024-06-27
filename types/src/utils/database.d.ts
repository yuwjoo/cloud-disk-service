export interface UsersTable {
  account: string; // 账号
  password: string; // 密码
  nickname: string; // 昵称
  avatar: string | null; // 头像
  status: 'enable' | 'disabled'; // enable: 启用；disabled: 禁用
  role_code: string; // 角色code
  root_folder_id: number; // 根文件夹id
  create_date: string; // 创建日期
  modified_date: string; // 修改日期
} // 用户表

export interface RolesTable {
  code: string; // 角色code
  name: string; // 角色名称
} // 角色表

export interface LoginRecordsTable {
  account: string; // 关联账号
  token: string; // 关联token
  token_created_date: string; // token的创建日期
  token_expires_date: string; // token的过期日期
} // 登录记录表

export interface STSRecordsTable {
  account: string; // 关联账号
  access_key_id: string; // AccessKeyId
  access_key_secret: string; // AccessKeySecret
  security_token: string; // SecurityToken
  expiration: string; // Expiration
  upload_path: string; // 上传路径
} // sts记录表

export interface ResourcesTable {
  id: number; // id
  object: string; // oss object
  size: number; // 大小
  mime_type: string | null; // MIME类型
  hash: string; // hash值
  reference_count: number; // 被引用计数
  create_date: string; // 创建日期
  modified_date: string; // 修改日期
} // 资源表

export interface DirectorysTable {
  id: number; // id
  parent_path: string; // 父级路径
  name: string; // 名称
  size: number; // 大小
  type: 'folder' | 'file'; // 类型
  mime_type: string | null; // MIME类型
  resources_id: number | null; // 关联的资源id
  create_account: string; // 创建人账号
  create_date: string; // 创建日期
  modified_date: string; // 修改日期
} // 目录表

export {};
