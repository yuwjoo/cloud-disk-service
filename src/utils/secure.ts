import type { JwtUserParams, JwtUserPayload } from 'types/src/utils/secure';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { useConfig } from './config';
import { base64ToString } from './utils';

const secretKey = Buffer.from(useConfig().secretKeyBase64, 'base64');
const iv = Buffer.from(useConfig().ivBase64, 'base64');
const publicKey = base64ToString(useConfig().publicKeyBase64);
const privateKey = base64ToString(useConfig().privateKeyBase64);

/**
 * @description: 对称加密
 * @param {string} text 文本
 * @return {string} 加密文本
 */
export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * @description: 对称解密
 * @param {string} encryptedText 加密文本
 * @return {string} 文本
 */
export function decrypt(encryptedText: string): string {
  let decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * @description: 生成RSA密钥对
 * @return {crypto.KeyPairSyncResult<string, string>} 生成给密钥对
 */
export function generateKey(): crypto.KeyPairSyncResult<string, string> {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: useConfig().secretKeyBase64
    }
  });
}

/**
 * @description: 非对称加密数据
 * @param {string} data 原数据
 * @return {string} 加密数据
 */
export function publicEncrypt(data: string): string {
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(data)
  );
  return encrypted.toString('base64');
}

/**
 * @description: 非对称解密数据
 * @param {string} encrypted 加密数据
 * @return {string} 原数据
 */
export function privateDecrypt(encrypted: string): string {
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
      passphrase: useConfig().secretKeyBase64
    },
    Buffer.from(encrypted, 'base64')
  );
  return decrypted.toString();
}

/**
 * @description: 创建hash值
 * @param {string} data 原数据
 * @return {string} hash值
 */
export function createHash(data: string): string {
  return crypto.createHmac('sha256', useConfig().secretKeyBase64).update(data).digest('hex');
}

/**
 * @description: 创建用户token
 * @param {JwtUserParams} data 额外信息
 * @return {string} token
 */
export function createUserToken(data: JwtUserParams, options?: jwt.SignOptions): string {
  return jwt.sign(data, useConfig().secretKeyBase64, options);
}

/**
 * @description: 校验用户token
 * @param {string} token token
 * @return {JwtUserPayload} token信息
 */
export function verifyUserToken(token: string): JwtUserPayload {
  return jwt.verify(token, useConfig().secretKeyBase64) as JwtUserPayload;
}
