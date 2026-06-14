import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
}

export const generateAccessToken = (userId: string): string => {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not defined');
  const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not defined');
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET) as JwtPayload;
};
