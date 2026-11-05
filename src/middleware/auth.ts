import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthenticatedRequest, AuthUser } from '../types';

export const AUTH_COOKIE_NAME = 'auth_token';

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as AuthUser;
  } catch (error) {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  const isProduction = ENV.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

export function clearAuthCookie(res: Response): void {
  const isProduction = ENV.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 0,
    path: '/'
  });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return next();
  }

  const user = verifyToken(token);
  if (user) {
    req.user = user;
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    return;
  }

  req.user = user;
  next();
}
