/**
 * @description: 文件名合法性校验
 * @param {string} text 文本
 * @return {boolean} 是否合法
 */
export function testFilename(text: string): boolean {
  return /^[^"*<>?\\|/:]+$/.test(text);
}
