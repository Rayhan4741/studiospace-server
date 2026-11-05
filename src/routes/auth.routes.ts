import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDB } from '../config/db';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../middleware/auth';
import { AuthenticatedRequest, UserDocument } from '../types';
import { ENV } from '../config/env';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  profilePhoto: z.string().url('Invalid URL').optional().or(z.literal('')),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const validated = registerSchema.parse(req.body);
    const db = getDB();

    const existingUser = await db.collection<UserDocument>('users').findOne({
      email: validated.email.toLowerCase()
    });

    if (existingUser) {
      res.status(409).json({ success: false, message: 'Email is already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const newUser: Omit<UserDocument, '_id'> = {
      name: validated.name.trim(),
      email: validated.email.toLowerCase().trim(),
      password: hashedPassword,
      profilePhoto: validated.profilePhoto || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`,
      role: 'user',
      provider: 'credentials',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(newUser as any);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully. Please log in.',
      userId: result.insertedId.toString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const db = getDB();

    const user = await db.collection<UserDocument>('users').findOne({
      email: validated.email.toLowerCase().trim()
    });

    if (!user || !user.password) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(validated.password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const authUser = {
      id: user._id.toString(),
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto
    };

    const token = signToken(authUser);
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Logged in successfully',
      user: authUser,
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const db = getDB();
    const userDoc = await db.collection<UserDocument>('users').findOne({
      _id: new ObjectId(req.user!.userId)
    });

    const authUser = {
      id: req.user!.userId,
      userId: req.user!.userId,
      name: userDoc?.name || req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
      profilePhoto: userDoc?.profilePhoto || req.user!.profilePhoto
    };

    const token = signToken(authUser);
    setAuthCookie(res, token);

    res.json({
      success: true,
      user: authUser,
      token
    });
  } catch (error) {
    next(error);
  }
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  profilePhoto: z.string().url('Invalid URL').optional().or(z.literal(''))
});

// PUT /api/auth/profile (Protected - Update user profile)
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const validated = updateProfileSchema.parse(req.body);
    const db = getDB();
    const userId = req.user!.userId;

    const updateFields: any = { updatedAt: new Date() };
    if (validated.name) updateFields.name = validated.name.trim();
    if (validated.profilePhoto !== undefined) updateFields.profilePhoto = validated.profilePhoto;

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateFields }
    );

    // If name changed, update ownerName across their studio listings
    if (validated.name) {
      await db.collection('studios').updateMany(
        { ownerId: new ObjectId(userId) },
        { $set: { ownerName: validated.name.trim() } }
      );
    }

    const updatedUser = await db.collection<UserDocument>('users').findOne({ _id: new ObjectId(userId) });

    const authUser = {
      id: userId,
      userId,
      name: updatedUser?.name || req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
      profilePhoto: updatedUser?.profilePhoto || req.user!.profilePhoto
    };

    const token = signToken(authUser);
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: authUser,
      token
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth config & status
router.get('/google/url', (req: Request, res: Response) => {
  if (!ENV.GOOGLE_CLIENT_ID) {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured on this server. Missing GOOGLE_CLIENT_ID.'
    });
    return;
  }

  const redirectUri = `${ENV.BETTER_AUTH_URL}/api/auth/google/callback`;
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: redirectUri,
    client_id: ENV.GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  res.json({ success: true, url: `${rootUrl}?${qs.toString()}` });
});

export default router;

