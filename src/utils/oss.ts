import OSS, { STS } from 'ali-oss';
import { useConfig } from './config';

let sts: STS; // sts对象
let admin: OSS; // admin对象

/**
 * @description: 使用sts
 * @return {STS} sts
 */
export function useSTS(): STS {
  if (sts) return sts;

  sts = new STS({
    accessKeyId: useConfig().oss.stsAccessKeyID,
    accessKeySecret: useConfig().oss.stsAccessKeySecret
  });
  return sts;
}

/**
 * @description: 使用admin
 * @return {OSS} admin
 */
export function useAdmin(): OSS {
  if (admin) return admin;

  admin = new OSS({
    region: 'oss-cn-shenzhen',
    accessKeyId: useConfig().oss.adminAccessKeyID,
    accessKeySecret: useConfig().oss.adminAccessKeySecret,
    bucket: useConfig().oss.bucketName
  });
  return admin;
}
