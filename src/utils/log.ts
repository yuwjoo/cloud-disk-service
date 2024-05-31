/**
 * @description: 打印日志
 * @param {any} message 消息
 * @param {array} optionalParams 其他参数
 */
export function log(message?: any, ...optionalParams: any[]) {
  console.log(message, ...optionalParams);
}

/**
 * @description: 打印警告
 * @param {any} message 消息
 * @param {array} optionalParams 其他参数
 */
export function warn(message?: any, ...optionalParams: any[]) {
  console.warn(message, ...optionalParams);
}

/**
 * @description: 打印异常
 * @param {any} message 消息
 * @param {array} optionalParams 其他参数
 */
export function error(message?: any, ...optionalParams: any[]) {
  console.error(message, ...optionalParams);
}
