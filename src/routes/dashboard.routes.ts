import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest, StudioDocument, BookingDocument, UserDocument } from '../types';

const router = Router();

// GET /api/dashboard/stats (Protected)
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const db = getDB();
    const userId = req.user!.userId;
    const userObjectId = new ObjectId(userId);

    const [
      userDoc,
      studiosListedCount,
      myBookingsCount,
      hostBookingsCount,
      pendingBookingsCount,
      recentBookings,
      recentStudios
    ] = await Promise.all([
      db.collection<UserDocument>('users').findOne({ _id: userObjectId }),
      db.collection<StudioDocument>('studios').countDocuments({ ownerId: userObjectId }),
      db.collection<BookingDocument>('bookings').countDocuments({ creatorId: userObjectId }),
      db.collection<BookingDocument>('bookings').countDocuments({ ownerId: userObjectId }),
      db.collection<BookingDocument>('bookings').countDocuments({
        creatorId: userObjectId,
        status: 'Pending'
      }),
      db.collection<BookingDocument>('bookings')
        .find({ creatorId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      db.collection<StudioDocument>('studios')
        .find({ ownerId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(4)
        .toArray()
    ]);

    res.json({
      success: true,
      data: {
        user: {
          id: userId,
          name: req.user!.name,
          email: req.user!.email,
          role: req.user!.role,
          profilePhoto: userDoc?.profilePhoto || req.user!.profilePhoto
        },
        metrics: {
          totalStudiosListed: studiosListedCount,
          totalBookings: myBookingsCount,
          totalHostBookings: hostBookingsCount,
          pendingBookings: pendingBookingsCount
        },
        recentActivity: {
          bookings: recentBookings,
          studios: recentStudios
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
