import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studiospace',
  DB_NAME: process.env.DB_NAME || 'studiospace',
  JWT_SECRET: process.env.JWT_SECRET || 'studiospace-super-secure-jwt-secret-key-32chars',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'studiospace-better-auth-secret-key-32chars',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  IMGBB_API_KEY: process.env.IMGBB_API_KEY || ''
};

