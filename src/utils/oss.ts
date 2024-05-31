import { STS } from 'ali-oss';
import { useConfig } from './config';

let sts: STS; // sts对象

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
