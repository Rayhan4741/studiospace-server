import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export function simpleRateLimit(limit = 100, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!store[ip] || now > store[ip].resetTime) {
      store[ip] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    store[ip].count++;

    if (store[ip].count > limit) {
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP. Please try again later.'
      });
      return;
    }

    next();
  };
}
