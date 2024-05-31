import type { JwtPayload } from 'jsonwebtoken';
import type { UsersTable } from 'types/src/utils/database';

export type JwtUserParams = {
  account: UsersTable['account']; // 账号
};

export type JwtUserPayload = JwtUserParams & JwtPayload;

export {};
