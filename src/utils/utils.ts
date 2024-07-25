import tinytime from 'tinytime';
import { useConfig } from './config';

const dbTimeTemplate = tinytime('{YYYY}-{Mo}-{DD} {H}:{mm}:{ss}', { padMonth: true }); // 数据库时间格式化模板

/**
 * @description: 对象转查询字符串
 * @param {Record} obj 对象
 * @return {string} 查询字符串
 */
export function objectToQueryStr(obj: Record<string, any>): string {
  let str = '';
  Object.keys(obj).forEach((key) => {
    str += `&${key}=${encodeURIComponent(obj[key])}`;
  });
  return str.slice(1);
}

/**
 * @description: 查询字符串转对象
 * @param {string} queryStr 查询字符串
 * @return {Record<string, any>} 对象
 */
export function queryStrToObject(queryStr: string): Record<string, any> {
  let obj: Record<string, any> = {};
  for (let param of queryStr.split('&')) {
    const [key, value] = param.split('=');
    obj[key] = decodeURIComponent(value);
  }
  return obj;
}

/**
 * @description: 字符串转base64
 * @param {string} str 字符串
 * @return {string} base64
 */
export function stringToBase64(str: string): string {
  if (!str) '';
  return Buffer.from(str).toString('base64');
}

/**
 * @description: base64转字符串
 * @param {string} base64 base64
 * @return {string} 字符串
 */
export function base64ToString(base64: string): string {
  if (!base64) '';
  return Buffer.from(base64, 'base64').toString();
}

/**
 * @description: 拆分路径
 * @param {string} path 路径字符串
 * @return {string[]} 路径数组
 */
export function splitPath(path: string): string[] {
  return path.replace(/\\/g, '/').split('/').filter(Boolean);
}

/**
 * @description: 合并路径
 * @param {string[]} args 路径参数
 * @return {string} 路径字符串
 */
export function joinPath(...args: string[]): string {
  let arr = [];

  for (let path of args) {
    arr.push(...path.split('/').filter(Boolean));
  }

  return '/' + arr.join('/');
}

/**
 * @description: 转化为数据库时间
 * @param {string | number | Date} value 值
 * @return {string} 日期字符串
 */
export function toDBDate(value: string | number | Date): string {
  return dbTimeTemplate.render(new Date(value));
}

/**
 * @description: 获取服务器url
 * @return {string} 服务器url
 */
export function getServerUrl(): string {
  const port = process.env.mode === 'development' ? 80 : useConfig().port;
  return `${useConfig().protocol}://${useConfig().host}:${port}`;
}
