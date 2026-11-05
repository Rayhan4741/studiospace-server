import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDB } from '../config/db';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest, BookingDocument, StudioDocument } from '../types';

const router = Router();

// Helper to convert "HH:MM" to minutes from 00:00
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

const createBookingSchema = z.object({
  studioId: z.string().refine((val) => ObjectId.isValid(val), { message: 'Invalid Studio ID' }),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be HH:MM'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be HH:MM'),
}).refine((data) => {
  return timeToMinutes(data.startTime) < timeToMinutes(data.endTime);
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

// POST /api/bookings (Protected)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const validated = createBookingSchema.parse(req.body);
    const db = getDB();
    const user = req.user!;

    // Check past date
    const todayStr = new Date().toISOString().split('T')[0];
    if (validated.bookingDate < todayStr) {
      res.status(400).json({ success: false, message: 'Booking date cannot be in the past' });
      return;
    }

    // Fetch studio
    const studio = await db
      .collection<StudioDocument>('studios')
      .findOne({ _id: new ObjectId(validated.studioId) });

    if (!studio) {
      res.status(404).json({ success: false, message: 'Studio space not found' });
      return;
    }

    const startMinutes = timeToMinutes(validated.startTime);
    const endMinutes = timeToMinutes(validated.endTime);
    const totalMinutes = endMinutes - startMinutes;
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    if (totalHours <= 0) {
      res.status(400).json({ success: false, message: 'Total booking duration must be at least 30 minutes' });
      return;
    }

    // Check collision with Confirmed bookings for same studio on same date
    const existingConfirmedBookings = await db
      .collection<BookingDocument>('bookings')
      .find({
        studioId: studio._id,
        bookingDate: validated.bookingDate,
        status: 'Confirmed'
      })
      .toArray();

    // Check time collision: (StartA < EndB) and (EndA > StartB)
    for (const b of existingConfirmedBookings) {
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);

      if (startMinutes < bEnd && endMinutes > bStart) {
        res.status(409).json({
          success: false,
          message: `Booking collision: Studio is already booked on ${validated.bookingDate} between ${b.startTime} and ${b.endTime}. Please choose another time slot.`
        });
        return;
      }
    }

    const totalPrice = Math.round((studio.hourlyRate * totalHours) + studio.securityDeposit);

    const newBooking: Omit<BookingDocument, '_id'> = {
      studioId: studio._id,
      studioTitle: studio.title,
      studioImage: studio.imageUrl,
      ownerId: studio.ownerId,
      creatorId: new ObjectId(user.userId),
      creatorName: user.name,
      creatorEmail: user.email,
      bookingDate: validated.bookingDate,
      startTime: validated.startTime,
      endTime: validated.endTime,
      totalHours,
      totalPrice,
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('bookings').insertOne(newBooking as any);

    res.status(201).json({
      success: true,
      message: 'Workspace booked successfully! Reservation status is Pending.',
      bookingId: result.insertedId.toString(),
      data: {
        ...newBooking,
        _id: result.insertedId
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bookings/my-bookings (Protected)
router.get('/my-bookings', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const db = getDB();
    const userId = req.user!.userId;

    const bookings = await db
      .collection<BookingDocument>('bookings')
      .find({ creatorId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bookings/owner-bookings (Protected)
router.get('/owner-bookings', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const db = getDB();
    const userId = req.user!.userId;

    const bookings = await db
      .collection<BookingDocument>('bookings')
      .find({ ownerId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/bookings/:id/cancel (Protected - Only creator, only Pending)
router.patch('/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid Booking ID' });
      return;
    }

    const db = getDB();
    const userId = req.user!.userId;

    const booking = await db
      .collection<BookingDocument>('bookings')
      .findOne({ _id: new ObjectId(id) });

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    // Ownership check
    if (booking.creatorId.toString() !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Forbidden. You do not own this booking.' });
      return;
    }

    // Can only cancel Pending bookings
    if (booking.status !== 'Pending') {
      res.status(400).json({
        success: false,
        message: `Only Pending bookings can be cancelled. Current status is ${booking.status}.`
      });
      return;
    }

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'Cancelled', updatedAt: new Date() } }
    );

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/bookings/:id/status (Protected - Studio Owner or Admin can confirm/complete)
router.patch('/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid Booking ID' });
      return;
    }

    if (!['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const db = getDB();
    const userId = req.user!.userId;

    const booking = await db
      .collection<BookingDocument>('bookings')
      .findOne({ _id: new ObjectId(id) });

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    // Owner check: either studio owner or admin
    if (booking.ownerId.toString() !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Forbidden. Only the studio host can update this booking status.' });
      return;
    }

    // If confirming, check collision
    if (status === 'Confirmed') {
      const startMinutes = timeToMinutes(booking.startTime);
      const endMinutes = timeToMinutes(booking.endTime);

      const conflicts = await db
        .collection<BookingDocument>('bookings')
        .find({
          _id: { $ne: booking._id },
          studioId: booking.studioId,
          bookingDate: booking.bookingDate,
          status: 'Confirmed'
        })
        .toArray();

      for (const c of conflicts) {
        const cStart = timeToMinutes(c.startTime);
        const cEnd = timeToMinutes(c.endTime);

        if (startMinutes < cEnd && endMinutes > cStart) {
          res.status(409).json({
            success: false,
            message: `Cannot confirm: Collision with existing confirmed booking (${c.startTime} - ${c.endTime}).`
          });
          return;
        }
      }
    }

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    res.json({
      success: true,
      message: `Booking status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
});

export default router;

