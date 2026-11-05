import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/error';

import authRoutes from './routes/auth.routes';
import studioRoutes from './routes/studio.routes';
import bookingRoutes from './routes/booking.routes';
import dashboardRoutes from './routes/dashboard.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// Allowed origins
const allowedOrigins = [
  ENV.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://studiospace.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin === allowed || origin.endsWith('.vercel.app'))) {
      return callback(null, true);
    }
    return callback(null, true); // Dev flexible fallback
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global auth context extraction
app.use(authenticate);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'studiospace-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Centralized Error Handler
app.use(errorHandler);

const PORT = parseInt(ENV.PORT, 10) || 5000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[StudioSpace Server] Server running on port ${PORT} in ${ENV.NODE_ENV} mode`);
      console.log(`[StudioSpace Server] Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('[StudioSpace Server] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
