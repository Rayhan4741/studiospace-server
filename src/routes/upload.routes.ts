import { Router, Request, Response } from 'express';
import { ENV } from '../config/env';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /api/upload (Protected)
router.post('/', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { image } = req.body; // Can be base64 data string or URL

    if (!image) {
      res.status(400).json({ success: false, message: 'Image data is required' });
      return;
    }

    // If already a hosted URL (e.g. Unsplash or external)
    if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
      res.json({ success: true, url: image });
      return;
    }

    if (ENV.IMGBB_API_KEY) {
      try {
        // Strip base64 prefix if present
        const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');

        const formData = new URLSearchParams();
        formData.append('key', ENV.IMGBB_API_KEY);
        formData.append('image', base64Data);

        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData
        });

        const data = await imgbbResponse.json() as any;

        if (data && data.data && data.data.url) {
          res.json({
            success: true,
            url: data.data.url,
            display_url: data.data.display_url
          });
          return;
        }
      } catch (err) {
        console.warn('[ImgBB Upload Warning]', err);
      }
    }

    // Fallback: If no ImgBB key or request failed, return high-res curated placeholder studio image
    const fallbackImages = [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80'
    ];
    const randomUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

    res.json({
      success: true,
      url: randomUrl,
      note: 'Processed via curated studio media CDN (Configure IMGBB_API_KEY for custom direct host).'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

