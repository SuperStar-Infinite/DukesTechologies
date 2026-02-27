# Backend Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Create `.env` File

Create a `.env` file in the `backend` folder with the following:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/relay
# Or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/relay

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Cloudflare R2
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-custom-domain.com
# Or use R2 public URL: https://pub-xxxxx.r2.dev
# Note: R2_ENDPOINT is optional, defaults to https://{ACCOUNT_ID}.r2.cloudflarestorage.com
```

### 3. Set Up MongoDB

**Option A: Local MongoDB**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

**Option B: MongoDB Atlas (Recommended for Production)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster
4. Get connection string
5. Add to `.env` as `MONGODB_URI`

### 4. Set Up Cloudflare R2

1. Go to https://dash.cloudflare.com (create account if needed)
2. Navigate to **R2** in the sidebar
3. Create a new bucket (e.g., `relay-logos`)
4. Go to **Manage R2 API Tokens** → **Create API Token**
5. Set permissions: **Object Read & Write**
6. Copy the credentials:
   - **Account ID** (found in R2 dashboard URL or account settings)
   - **Access Key ID** (from the API token you just created)
   - **Secret Access Key** (from the API token - save this, it's only shown once!)
7. For public access, you can either:
   - **Option A**: Use a custom domain (recommended)
     - Go to bucket settings → **Public Access**
     - Connect a custom domain or use the provided R2 public URL
   - **Option B**: Use R2 public URL format: `https://pub-xxxxx.r2.dev`
8. Add all credentials to `.env`

### 5. Seed Initial Data

```bash
npm run seed
```

This creates:
- Dukes admin: `dukes@dukestechnologies.com` / `dukes123`
- Morton's restaurant: `admin@mortons.com` / `mortons123`
- J. Alexander's: `admin@jalexanders.com` / `jalexanders123`

### 6. Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will run on `http://localhost:5000`

## Testing

Test the API:

```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mortons.com","password":"mortons123"}'
```

## Next: Connect Frontend

Once backend is running, update the frontend to use real API endpoints instead of mock data.
