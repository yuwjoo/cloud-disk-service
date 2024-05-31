export interface Config {
  platform: 'win' | 'linux'; // 运行平台
  port: number; // 监听端口
  tempTokenExpirationTime: number; // 临时token过期时间（单位：秒）
  tokenExpirationTime: number; // 长期token过期时间（单位：秒）
  databasePath: string; // 数据库路径
  ossStsExpirationTime: number; // oss临时凭证过期时间（单位：秒）
  salt: string; // 随机盐值
  publicKeyBase64: string; // 非对称加密公钥base64字符串
  privateKeyBase64: string; // 非对称加密私钥base64字符串
  admin: {
    account: string; // 默认账号
    password: string; // 默认密码
  };
  oss: {
    bucketName: string; // bucket名称
    stsAccount: string; // sts账号
    stsAccessKeyID: string; // sts AccessKeyID
    stsAccessKeySecret: string; // sts AccessKeySecret
    stsRAMRole: string; // sts角色
    uploadPublicKeyBase64: string; // 上传回调签名公钥base64字符串
  };
}
