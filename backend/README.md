# RELAY Backend API

Production-ready backend for the RELAY discount code system.

## Tech Stack

- **Node.js** + **Express** - Server framework
- **MongoDB** + **Mongoose** - Database
- **JWT** - Authentication
- **Cloudflare R2** - File storage for restaurant logos (S3-compatible)
- **bcryptjs** - Password hashing
- **multer** - File upload handling

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID` - Cloudflare R2 access key ID
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret access key
- `R2_BUCKET_NAME` - Cloudflare R2 bucket name
- `R2_PUBLIC_URL` - Public URL for accessing files (custom domain or R2 public URL)

### 3. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Add to `.env` as `MONGODB_URI`

### 4. Cloudflare R2 Setup

1. Create account at https://dash.cloudflare.com
2. Navigate to R2 and create a bucket
3. Create API token with Object Read & Write permissions
4. Set up public access (custom domain or use R2 public URL)
5. Add credentials to `.env`

See `SETUP.md` for detailed R2 setup instructions.

### 5. Run Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:5000` by default.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

### Codes
- `POST /api/codes` - Create new code (Restaurant)
- `GET /api/codes` - Get all codes for restaurant
- `GET /api/codes/:code` - Get code by code string (Public)

### Server Validation
- `POST /api/server/validate` - Validate code and log submission (Public)

### Restaurants
- `POST /api/restaurants/onboarding` - Complete onboarding
- `GET /api/restaurants/profile` - Get profile
- `PUT /api/restaurants/profile` - Update profile

### Upload
- `POST /api/upload/logo` - Upload logo to Cloudflare R2
- `DELETE /api/upload/logo` - Delete logo from R2

### Dukes Admin
- `GET /api/dukes/restaurants` - Get all restaurants with stats
- `GET /api/dukes/restaurants/:id/codes` - Get codes for restaurant
- `GET /api/dukes/codes` - Get all codes

## Authentication

Most endpoints require JWT authentication. Include token in header:

```
Authorization: Bearer <token>
```

## Database Models

### User
- Restaurant and Dukes admin users
- Stores locations, callers, monthly code counts

### Code
- Discount codes with expiration, locations, stats

### ValidationLog
- Logs of code validations with bill amounts

## Next Steps

1. Create initial Dukes admin user (seed script)
2. Connect frontend to API endpoints
3. Add Google Sheets integration
4. Add Stripe integration for caller subscriptions
