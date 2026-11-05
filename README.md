# StudioSpace Server API

Production-ready RESTful backend engine powering **StudioSpace**, the peer-to-peer creative workspace marketplace.

## 1. Project Description
StudioSpace Server delivers secure, resilient, and high-performance APIs for creator workspace discovery, real-time availability checking, booking collision resolution, and studio host listings.

## 2. Technology Stack
- **Runtime**: Node.js v20+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB Atlas / MongoDB 8.x
- **Authentication**: JWT stored in HTTPOnly SameSite cookies & Better Auth compatible session structure
- **Validation**: Zod schema validation
- **Password Security**: Bcrypt with 12 salt rounds
- **Media Upload**: ImgBB API with fallback fallback studio CDN

## 3. Database Collections & Architecture

### `users`
- `_id`: ObjectId
- `name`: String
- `email`: String (Unique index)
- `password`: String (Hashed with Bcrypt)
- `profilePhoto`: String (URL)
- `role`: 'user' | 'owner' | 'admin'
- `provider`: 'credentials' | 'google'
- `createdAt`, `updatedAt`: Date

### `studios`
- `_id`: ObjectId
- `title`: String (Text indexed)
- `category`: 'Photo Studios' | 'Film Stages' | 'Podcast Rooms' | 'Music Suites' | 'Art Workshops'
- `hourlyRate`: Number
- `securityDeposit`: Number
- `maxCapacity`: Number
- `location`: String (Text indexed)
- `imageUrl`: String
- `gallery`: Array of URLs
- `amenities`: Array of strings
- `overview`: String
- `rating`: Number (e.g. 4.95)
- `reviewCount`: Number
- `ownerId`: ObjectId (Indexed)
- `ownerName`: String
- `ownerEmail`: String
- `createdAt`, `updatedAt`: Date

### `bookings`
- `_id`: ObjectId
- `studioId`: ObjectId (Indexed)
- `studioTitle`: String
- `studioImage`: String
- `ownerId`: ObjectId (Indexed)
- `creatorId`: ObjectId (Indexed)
- `creatorName`: String
- `creatorEmail`: String
- `bookingDate`: String (YYYY-MM-DD)
- `startTime`: String (HH:MM)
- `endTime`: String (HH:MM)
- `totalHours`: Number
- `totalPrice`: Number
- `status`: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
- `createdAt`, `updatedAt`: Date

## 4. API Endpoints

### Health & Diagnostics
- `GET /api/health` - Service health status, uptime, and timestamp.

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create new user account.
- `POST /api/auth/login` - Authenticate credentials and receive HTTPOnly `auth_token` cookie.
- `POST /api/auth/logout` - Clear auth session cookie.
- `GET /api/auth/me` - Retrieve current authenticated user.
- `GET /api/auth/google/url` - Returns Google OAuth sign-in URL.

### Studios (`/api/studios`)
- `GET /api/studios/featured` - Get top 6 curated studios for homepage.
- `GET /api/studios` - Search, filter by category and price, sort, and paginate.
- `GET /api/studios/:id` - Get detailed studio profile.
- `GET /api/studios/user/my-listings` - Get authenticated user's listings *(Protected)*.
- `POST /api/studios` - Create new studio listing *(Protected)*.
- `PUT /api/studios/:id` - Update studio listing *(Protected, Owner only)*.
- `DELETE /api/studios/:id` - Delete studio listing *(Protected, Owner only)*.

### Bookings (`/api/bookings`)
- `POST /api/bookings` - Create reservation with double-booking collision prevention *(Protected)*.
- `GET /api/bookings/my-bookings` - Get current creator's bookings *(Protected)*.
- `GET /api/bookings/owner-bookings` - Get bookings on studios owned by current user *(Protected)*.
- `PATCH /api/bookings/:id/cancel` - Cancel a Pending booking *(Protected, Creator only)*.
- `PATCH /api/bookings/:id/status` - Update status to Confirmed, Completed, or Cancelled *(Protected, Host only)*.

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/stats` - Consolidated metrics for listings, bookings, and activity *(Protected)*.

### Media Upload (`/api/upload`)
- `POST /api/upload` - Upload image via ImgBB or CDN *(Protected)*.

## 5. Double-Booking Collision Prevention Logic
When booking a studio for date `D` and interval `[Start_New, End_New]`:
1. The server checks the database for existing bookings on the same `studioId` and `bookingDate` with `status === 'Confirmed'`.
2. Time overlap check: `Start_New < Existing_End && End_New > Existing_Start`.
3. If overlap is found, server rejects with **HTTP 409 Conflict** and returns the exact collision window.
4. If no collision, reservation is saved with status `Pending`.

## 6. Environment Variables

Create `.env` based on `.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/studiospace
DB_NAME=studiospace
JWT_SECRET=studiospace_jwt_secret_development_key_minimum_32_characters
BETTER_AUTH_SECRET=studiospace_better_auth_secret_key_minimum_32_characters
BETTER_AUTH_URL=http://localhost:5000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLIENT_URL=http://localhost:3000
IMGBB_API_KEY=
```

## 7. Local Installation & Development
```bash
# 1. Install dependencies
npm install

# 2. Seed database with initial studios and test users
npm run seed

# 3. Start development server
npm run dev

# 4. Build for production
npm run build

# 5. Start production server
npm start
```

## 8. Test Accounts (Examiner Credentials)
- **Host Account**:
  - Email: `elena@studiospace.io`
  - Password: `StudioSpace2025!`
- **Creator Account**:
  - Email: `marcus@creator.io`
  - Password: `StudioSpace2025!`

## 9. Render Deployment Instructions
1. Push `studiospace-server` to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Connect the repository with:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Set environment variables on Render: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`.
