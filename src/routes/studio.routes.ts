import { Router, Request, Response } from 'express';
import { ObjectId, Filter } from 'mongodb';
import { z } from 'zod';
import { getDB } from '../config/db';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest, StudioDocument } from '../types';

const router = Router();

const studioSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.enum([
    'Photo Studios',
    'Film Stages',
    'Podcast Rooms',
    'Music Suites',
    'Art Workshops'
  ]),
  hourlyRate: z.coerce.number().min(1, 'Hourly rate must be greater than 0'),
  securityDeposit: z.coerce.number().min(0, 'Security deposit must be 0 or more'),
  maxCapacity: z.coerce.number().min(1, 'Capacity must be at least 1 person'),
  location: z.string().min(3, 'Location is required'),
  imageUrl: z.string().url('Cover image must be a valid URL'),
  gallery: z.array(z.string().url()).optional().default([]),
  amenities: z.array(z.string()).optional().default([]),
  overview: z.string().min(10, 'Overview must be at least 10 characters'),
});

// GET /api/studios/featured (Limit 6)
router.get('/featured', async (req: Request, res: Response, next) => {
  try {
    const db = getDB();
    const studios = await db
      .collection<StudioDocument>('studios')
      .find({})
      .sort({ rating: -1, createdAt: -1 })
      .limit(6)
      .toArray();

    res.json({
      success: true,
      data: studios
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/studios (Search, filter, sort, pagination)
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const db = getDB();
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = '1',
      limit = '12'
    } = req.query;

    const filter: Filter<StudioDocument> = {};

    if (category && typeof category === 'string' && category !== 'All') {
      filter.category = category as any;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: { $regex: searchRegex } },
        { location: { $regex: searchRegex } },
        { overview: { $regex: searchRegex } }
      ];
    }

    if (minPrice || maxPrice) {
      filter.hourlyRate = {};
      if (minPrice) filter.hourlyRate.$gte = Number(minPrice);
      if (maxPrice) filter.hourlyRate.$lte = Number(maxPrice);
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { hourlyRate: 1 };
    if (sort === 'price_desc') sortOption = { hourlyRate: -1 };
    if (sort === 'rating_desc') sortOption = { rating: -1 };

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 12);
    const skip = (pageNum - 1) * limitNum;

    const [total, studios] = await Promise.all([
      db.collection<StudioDocument>('studios').countDocuments(filter),
      db.collection<StudioDocument>('studios')
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .toArray()
    ]);

    res.json({
      success: true,
      data: studios,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/studios/user/my-listings (Protected)
router.get('/user/my-listings', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const db = getDB();
    const userId = req.user!.userId;

    const listings = await db
      .collection<StudioDocument>('studios')
      .find({ ownerId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: listings
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/studios/:id
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid Studio ID' });
      return;
    }

    const db = getDB();
    const studio = await db
      .collection<StudioDocument>('studios')
      .findOne({ _id: new ObjectId(id) });

    if (!studio) {
      res.status(404).json({ success: false, message: 'Studio space not found' });
      return;
    }

    res.json({
      success: true,
      data: studio
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/studios (Protected)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const validated = studioSchema.parse(req.body);
    const db = getDB();
    const user = req.user!;

    const newStudio: Omit<StudioDocument, '_id'> = {
      title: validated.title.trim(),
      category: validated.category,
      hourlyRate: Number(validated.hourlyRate),
      securityDeposit: Number(validated.securityDeposit),
      maxCapacity: Number(validated.maxCapacity),
      location: validated.location.trim(),
      imageUrl: validated.imageUrl,
      gallery: validated.gallery && validated.gallery.length > 0 ? validated.gallery : [validated.imageUrl],
      amenities: validated.amenities || [],
      overview: validated.overview.trim(),
      rating: 5.0, // Initial perfect baseline
      reviewCount: 0,
      ownerId: new ObjectId(user.userId),
      ownerName: user.name,
      ownerEmail: user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('studios').insertOne(newStudio as any);

    res.status(201).json({
      success: true,
      message: 'Studio listing created successfully',
      studioId: result.insertedId.toString()
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/studios/:id (Protected - Owner only)
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid Studio ID' });
      return;
    }

    const db = getDB();
    const userId = req.user!.userId;

    const existingStudio = await db
      .collection<StudioDocument>('studios')
      .findOne({ _id: new ObjectId(id) });

    if (!existingStudio) {
      res.status(404).json({ success: false, message: 'Studio space not found' });
      return;
    }

    // Ownership check before parsing payload
    if (existingStudio.ownerId.toString() !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Forbidden. You do not own this studio.' });
      return;
    }

    const validated = studioSchema.parse(req.body);

    const updateData = {
      title: validated.title.trim(),
      category: validated.category,
      hourlyRate: Number(validated.hourlyRate),
      securityDeposit: Number(validated.securityDeposit),
      maxCapacity: Number(validated.maxCapacity),
      location: validated.location.trim(),
      imageUrl: validated.imageUrl,
      gallery: validated.gallery && validated.gallery.length > 0 ? validated.gallery : [validated.imageUrl],
      amenities: validated.amenities || [],
      overview: validated.overview.trim(),
      updatedAt: new Date()
    };

    await db.collection('studios').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: 'Studio listing updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/studios/:id (Protected - Owner only)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid Studio ID' });
      return;
    }

    const db = getDB();
    const userId = req.user!.userId;

    const existingStudio = await db
      .collection<StudioDocument>('studios')
      .findOne({ _id: new ObjectId(id) });

    if (!existingStudio) {
      res.status(404).json({ success: false, message: 'Studio space not found' });
      return;
    }

    // Ownership check
    if (existingStudio.ownerId.toString() !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Forbidden. You do not own this studio.' });
      return;
    }

    await db.collection('studios').deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Studio listing deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

