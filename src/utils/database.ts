import type BetterSqlite3 from 'better-sqlite3';
import { useConfig } from '@/utils/config';
import Database from 'better-sqlite3';
import { error, log } from './log';
import fs from 'fs';
import { createHash } from './secure';

let db: BetterSqlite3.Database; // 数据库实例

/**
 * @description: 使用数据库
 * @return {BetterSqlite3.Database} 数据库实例
 */
export function useDatabase(): BetterSqlite3.Database {
  if (db) return db;

  try {
    const dbExists = fs.existsSync(useConfig().databasePath);
    db = new Database(useConfig().databasePath, {
      verbose: console.log, // 显示所有查询日志（可选）
      fileMustExist: false, // 如果数据库文件不存在，则抛出错误（可选）
      readonly: false // 以只读模式打开数据库（可选）
      // nativeBinding: '' // 二进制文件路径
    });
    if (!dbExists) initDatabase();
    log(`✅✅✅----------------- 数据库连接成功 -----------------✅✅✅`);
    return db;
  } catch (err: any) {
    error(`❌❌❌----------------- 数据库连接失败 -----------------❌❌❌`);
    throw err;
  }
}

/**
 * @description: 初始化数据库
 */
function initDatabase() {
  db.pragma('journal_mode = WAL'); // 主要为了提升性能，see: https://github.com/WiseLibs/better-sqlite3/tree/master?tab=readme-ov-file#usage

  db.prepare(
    `-- 创建用户表
    CREATE TABLE IF NOT EXISTS users (
      -- 账号
      account TEXT PRIMARY KEY,

      -- 密码
      password TEXT NOT NULL,

      -- 昵称
      nickname TEXT NOT NULL,

      -- 头像
      avatar TEXT,

      -- 状态 (active: 激活; disabled: 禁用)
      status TEXT NOT NULL DEFAULT 'active',

      -- 角色code (默认 普通用户: 002)
      role_code TEXT NOT NULL REFERENCES roles (code) DEFAULT '002',
      
      -- 根目录id
      root_directory_id INTEGER DEFAULT -1
    );`
  ).run();

  db.prepare(
    `-- 创建角色表
    CREATE TABLE IF NOT EXISTS roles (
      -- 角色code
      code TEXT PRIMARY KEY,

      -- 角色名称
      name TEXT NOT NULL UNIQUE
    );`
  ).run();

  db.prepare(
    `-- 创建登录记录表
    CREATE TABLE IF NOT EXISTS login_records (
        -- 关联账号
        account TEXT NOT NULL REFERENCES users (account) ON DELETE CASCADE,

        -- 关联token
        token TEXT UNIQUE NOT NULL,

        -- token的创建日期
        token_created_date DATETIME NOT NULL,

        -- token的过期日期
        token_expires_date DATETIME NOT NULL
    );`
  ).run();

  db.prepare(
    `-- 创建STS记录表
    CREATE TABLE IF NOT EXISTS sts_records (
        -- 关联账号
        account TEXT NOT NULL REFERENCES users (account) ON DELETE CASCADE,

        -- AccessKeyId
        access_key_id TEXT NOT NULL,

        -- AccessKeySecret
        access_key_secret TEXT NOT NULL,

        -- SecurityToken
        security_token TEXT NOT NULL,

        -- Expiration
        expiration TEXT NOT NULL,

        -- 上传路径
        upload_path TEXT NOT NULL
    );`
  ).run();

  db.prepare(
    `-- 创建资源表
    CREATE TABLE IF NOT EXISTS resources (
      -- id
      id INTEGER PRIMARY KEY AUTOINCREMENT,
    
      -- oss object
      object TEXT NOT NULL,
    
      -- 资源大小
      size REAL NOT NULL DEFAULT 0,

      -- 资源类型
      type TEXT NOT NULL,
    
      -- hash值
      hash TEXT NOT NULL,
    
      -- 被引用计数
      reference_count INTEGER NOT NULL DEFAULT 0,
    
      -- 创建人账号
      create_account TEXT NOT NULL,
    
      -- 创建日期
      create_date DATETIME NOT NULL DEFAULT (datetime (CURRENT_TIMESTAMP, 'localtime')),
    
      -- 修改日期
      modified_date DATETIME NOT NULL DEFAULT (datetime (CURRENT_TIMESTAMP, 'localtime'))
    );`
  ).run();

  db.prepare(
    `-- 创建目录表
    CREATE TABLE IF NOT EXISTS directorys (
      -- id
      id INTEGER PRIMARY KEY AUTOINCREMENT,
    
      -- 名称
      name TEXT NOT NULL,
      
      -- 大小
      size REAL NOT NULL DEFAULT 0,

      -- 类型
      type TEXT NOT NULL,
    
      -- 关联的资源id
      resources_id INTEGER REFERENCES resources(id) ON DELETE SET NULL,
      
      -- 父级目录id
      parent_id INTEGER REFERENCES directorys(id) ON DELETE CASCADE,
    
      -- 创建人账号
      create_account TEXT NOT NULL,
    
      -- 创建日期
      create_date DATETIME NOT NULL DEFAULT (datetime (CURRENT_TIMESTAMP, 'localtime')),
    
      -- 修改日期
      modified_date DATETIME NOT NULL DEFAULT (datetime (CURRENT_TIMESTAMP, 'localtime'))
    );`
  ).run();

  // 初始化角色数据
  db.prepare('INSERT OR IGNORE INTO roles (code, name) VALUES (?, ?)').run('001', '管理员');
  db.prepare('INSERT OR IGNORE INTO roles (code, name) VALUES (?, ?)').run('002', '普通用户');

  // 初始化账号数据
  db.prepare(
    'INSERT OR IGNORE INTO users (account, password, nickname, role_code, root_directory_id) VALUES (?, ?, ?, ?, ?)'
  ).run(useConfig().admin.account, createHash(useConfig().admin.password), '管理员', '001', 1);

  // 初始化目录数据
  db.prepare('INSERT OR IGNORE INTO directorys (name, type, create_account) VALUES (?, ?, ?)').run(
    'storage',
    'folder',
    useConfig().admin.account
  );
}
