import { Request } from 'express';
import { ObjectId } from 'mongodb';

export interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  password?: string;
  profilePhoto?: string;
  role: 'user' | 'admin' | 'owner';
  provider: 'credentials' | 'google';
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioDocument {
  _id: ObjectId;
  title: string;
  category: 'Photo Studios' | 'Film Stages' | 'Podcast Rooms' | 'Music Suites' | 'Art Workshops';
  hourlyRate: number;
  securityDeposit: number;
  maxCapacity: number;
  location: string;
  imageUrl: string;
  gallery: string[];
  amenities: string[];
  overview: string;
  rating: number;
  reviewCount: number;
  ownerId: ObjectId;
  ownerName: string;
  ownerEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingDocument {
  _id: ObjectId;
  studioId: ObjectId;
  studioTitle: string;
  studioImage: string;
  ownerId: ObjectId;
  creatorId: ObjectId;
  creatorName: string;
  creatorEmail: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:MM (24-hour format)
  endTime: string;     // HH:MM (24-hour format)
  totalHours: number;
  totalPrice: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  profilePhoto?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
