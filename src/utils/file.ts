import { useAdmin } from './oss';

/**
 * @description: 校验文件名
 * @param {string} fileName 文件名
 * @return {boolean} 是否合法
 */
export function validateFileName(fileName: string): boolean {
  return /^[^"*<>?\\|/:]+$/.test(fileName);
}

/**
 * @description: 生成文件封面
 * @param {string} name 文件名称
 * @return {string | undefined} 封面
 */
export function generateFileCover(name: string): string | undefined {
  const suffix = name.match(/\.(\w+)$/)?.[1].toLocaleLowerCase(); // 文件后缀

  switch (suffix) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
      return;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
    case 'iso':
      return 'localhost://compressedFile.png';
    case 'exe':
      return 'localhost://executionFile.png';
    case 'pdf':
      return 'localhost://pdfFile.png';
    default:
      return 'localhost://docmentFile.png';
  }
}

/**
 * @description: 生成封面url
 * @param {string} cover 封面
 * @return {string} 封面url
 */
export function generateCoverUrl(cover: string): string {
  if (cover.startsWith('localhost://')) {
    // 本地封面
    return cover;
  } else {
    // oss封面
    return useAdmin().signatureUrl(cover, { expires: 60, process: 'image/resize,w_80' });
  }
}

/**
 * @description: 生成OSS对象名称
 * @param {string} account 账号
 * @param {string} fileHash 文件hash
 * @param {string} fileName 文件名称
 * @return {string} OSS对象名称
 */
export function generateOssObjectName(account: string, fileHash: string, fileName: string): string {
  return `storage/${account}/${fileHash}-${Date.now()}-${fileName}`;
}
