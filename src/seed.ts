import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { connectDB, closeDB } from './config/db';
import { StudioDocument, UserDocument } from './types';

async function seed() {
  console.log('[Seed] Starting database seed...');
  const db = await connectDB();

  // Create demo host user
  const hostPassword = await bcrypt.hash('StudioSpace2025!', 12);
  const hostUser = {
    _id: new ObjectId(),
    name: 'Elena Vance',
    email: 'elena@studiospace.io',
    password: hostPassword,
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    role: 'owner' as const,
    provider: 'credentials' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const creatorUser = {
    _id: new ObjectId(),
    name: 'Marcus Chen',
    email: 'marcus@creator.io',
    password: hostPassword,
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    role: 'user' as const,
    provider: 'credentials' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Upsert users
  await db.collection('users').deleteMany({
    email: { $in: ['elena@studiospace.io', 'marcus@creator.io'] }
  });
  await db.collection('users').insertMany([hostUser, creatorUser]);

  // Clean and insert sample studios
  await db.collection('studios').deleteMany({ ownerEmail: 'elena@studiospace.io' });

  const sampleStudios: Omit<StudioDocument, '_id'>[] = [
    {
      title: 'The Daylight Loft & Cyclorama',
      category: 'Photo Studios',
      hourlyRate: 125,
      securityDeposit: 150,
      maxCapacity: 15,
      location: 'SoHo, New York, NY',
      imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
      ],
      amenities: ['14ft High Ceilings', 'Full White Cyc', 'Profoto Lighting Rig', 'Hair & Makeup Station', 'High-Speed Wi-Fi', 'Client Lounge Area'],
      overview: 'Spanning over 2,500 square feet, this south-facing daylight studio features floor-to-ceiling industrial windows, polished concrete floors, and a dedicated 20x20 corner cyclorama. Ideal for fashion editorials, e-commerce, and high-end portraiture.',
      rating: 4.95,
      reviewCount: 38,
      ownerId: hostUser._id,
      ownerName: hostUser.name,
      ownerEmail: hostUser.email,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Aura Sound & Mixing Suite',
      category: 'Music Suites',
      hourlyRate: 95,
      securityDeposit: 100,
      maxCapacity: 6,
      location: 'Silver Lake, Los Angeles, CA',
      imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80'
      ],
      amenities: ['Genelec 8351B Monitors', 'Universal Audio Apollo x8p', 'Neumann U87 Mic', 'Vocal Isolation Booth', 'Acoustically Tuned Room', 'Moog Sub 37'],
      overview: 'A world-class music production and mix suite engineered with zero acoustic compromises. Featuring analog outboard gear, vintage synthesizers, and pristine conversion tailored for recording artists, producers, and audio engineers.',
      rating: 4.98,
      reviewCount: 52,
      ownerId: hostUser._id,
      ownerName: hostUser.name,
      ownerEmail: hostUser.email,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Cinema One Soundstage & Virtual Production',
      category: 'Film Stages',
      hourlyRate: 250,
      securityDeposit: 300,
      maxCapacity: 35,
      location: 'Greenpoint, Brooklyn, NY',
      imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80'
      ],
      amenities: ['Soundproof Stage', 'Grid Power 300A 3-Phase', 'Drive-in Loading Bay', 'Green Screen Cyc', 'Production Office', 'Dressing Rooms'],
      overview: 'Full-service production soundstage equipped for commercial film shoots, music videos, and cinematic narratives. Includes massive drive-in bay doors for vehicles, overhead grid distribution, and silent HVAC.',
      rating: 4.92,
      reviewCount: 29,
      ownerId: hostUser._id,
      ownerName: hostUser.name,
      ownerEmail: hostUser.email,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Studio Echo: Broadcast Podcast Room',
      category: 'Podcast Rooms',
      hourlyRate: 75,
      securityDeposit: 50,
      maxCapacity: 5,
      location: 'River North, Chicago, IL',
      imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80'
      ],
      amenities: ['4x Shure SM7B Microphones', 'Rodecaster Pro II', 'Sony FX3 4K Multi-Cam', 'Custom Acoustic Wood Slats', 'Live Streaming Switcher'],
      overview: 'Turnkey 4K video podcast studio designed for creators who demand pristine broadcast sound and television-grade multicam video. Plug-and-record capability with automated camera switching and instant cloud backups.',
      rating: 4.89,
      reviewCount: 44,
      ownerId: hostUser._id,
      ownerName: hostUser.name,
      ownerEmail: hostUser.email,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'The Ceramic & Sculpture Atelier',
      category: 'Art Workshops',
      hourlyRate: 60,
      securityDeposit: 50,
      maxCapacity: 12,
      location: 'Mission District, San Francisco, CA',
      imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80'
      ],
      amenities: ['Shimpo Pottery Wheels', 'Electric Cone 10 Kiln', 'Hand-Building Workbenches', 'Slop Sinks & Clay Traps', 'Natural North Sky Skylights'],
      overview: 'A sun-drenched industrial creative studio dedicated to ceramics, sculpture, printmaking, and collaborative creative workshops. Surrounded by raw brick walls, high skylights, and expansive heavy-duty worktables.',
      rating: 4.97,
      reviewCount: 61,
      ownerId: hostUser._id,
      ownerName: hostUser.name,
      ownerEmail: hostUser.email,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Minimalist Editorial Penthouse',
      category: 'Photo Studios',
      hourlyRate: 140,
      securityDeposit: 150,
      maxCapacity: 10,
      location: 'Downtown, Los Angeles, CA',
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'
      ],
      amenities: ['Panoramic City Views', 'Mid-Century Modern Furniture', 'Warm Oak Flooring', 'South & West Exposure', 'Curated Styling Props'],
      overview: 'Curated editorial penthouse space designed for brand campaigns, lifestyle content, lookbooks, and high-fashion spreads. Dramatic golden hour light floods through unobstructed 10-foot panoramic windows.',
      rating: 4.96,
      reviewCount: 47,
      ownerId: hostUser._id,
      ownerName: hostUser.name,
      ownerEmail: hostUser.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await db.collection('studios').insertMany(sampleStudios as any);
  console.log(`[Seed] Seeded ${sampleStudios.length} studios successfully!`);
  console.log('[Seed] Seed complete.');
  await closeDB();
}

seed().catch(err => {
  console.error('[Seed Error]', err);
  process.exit(1);
});

