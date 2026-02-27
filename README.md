# RELAY - Discount Code System

A mobile-friendly web application for restaurant discount codes, powered by Dukes Technologies.

## Features

### Customer Flow
- **Code Entry Page**: Clean mobile-first interface for customers to enter discount codes
- **Offer Display Page**: Shows discount description, countdown timer, restaurant logos, and clickable reservation links
- **Error Handling**: User-friendly error messages for invalid or expired codes

### Server Validation
- **Server Validation Page** (`/server/validate`): Public URL (no login required) for restaurant servers to validate codes
- Enter discount code and bill amount
- Shows same offer page as customers see (validation confirmation)
- Automatically logs submissions and revenue

### Restaurant Admin
- **Login System**: Secure login with routing based on account type
- **Onboarding Flow**: First-time setup to add restaurant locations, reservation links, and logos
- **Admin Panel** with three main sections:
  - **Create New**: 
    - Caller dashboard showing status (Available/Active/Cooling Down)
    - Select multiple restaurant locations
    - Enter discount description
    - Set number of people to call (with 48-hour notice)
    - Set code duration
  - **View Past Codes**: Performance metrics showing submissions and revenue per code
  - **My Profile**: Edit locations, links, and logos (coming soon)

### Dukes Admin (Super Admin)
- **Read-Only Dashboard**: View all restaurants, their locations, and codes
- See total revenue, submissions, and active codes per restaurant
- Expandable restaurant cards showing detailed information

### Caller System
- Monthly subscription model: 1 caller = 4 codes/month
- One active campaign per caller at a time
- 48-hour mandatory gap between campaigns for same caller
- Visual status indicators: 🟢 Available, 🔴 Active, 🟡 Cooling Down

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Pages & Routes

### Public Pages
- `/` - Customer code entry page
- `/results/:code` - Offer display page (with countdown and restaurant links)
- `/server/validate` - Server validation page (public, no login)

### Authentication
- `/login` - Login page (routes to appropriate dashboard)

### Restaurant Admin
- `/restaurant/onboarding` - First-time setup (add locations, logos, links)
- `/restaurant/admin` - Main admin panel (Create New, Past Codes, Profile)

### Dukes Admin
- `/dukes/admin` - Read-only dashboard of all restaurants and codes

## Test Accounts

### Dukes Admin
- Email: `dukes@dukestechnologies.com`
- Password: `dukes123`

### Restaurant Admin (Onboarded)
- Email: `admin@mortons.com`
- Password: `mortons123`

- Email: `admin@jalexanders.com`
- Password: `jalexanders123`

### Restaurant Admin (New - Triggers Onboarding)
- Email: `new@restaurant.com`
- Password: `newrest123`

## Test Codes

- `ABYTXE` - Active code (4+ days remaining, Morton's locations)
- `DUKE30` - Expired code (for testing error states)

## Project Structure

```
src/
  ├── pages/
  │   ├── CodeEntry.jsx           # Customer code entry
  │   ├── CodeResults.jsx         # Offer display page
  │   ├── ServerValidation.jsx    # Server validation page
  │   ├── Login.jsx               # Login page
  │   ├── RestaurantOnboarding.jsx # Restaurant setup
  │   ├── RestaurantAdmin.jsx     # Restaurant admin panel
  │   └── DukesAdmin.jsx          # Dukes super admin
  ├── styles/
  │   ├── CodeEntry.css
  │   ├── CodeResults.css
  │   ├── ServerValidation.css
  │   ├── Login.css
  │   ├── RestaurantOnboarding.css
  │   ├── RestaurantAdmin.css
  │   └── DukesAdmin.css
  ├── services/
  │   └── mockData.js             # Mock data service
  ├── App.jsx                     # Router configuration
  └── main.jsx                    # Entry point
```

## Key Features

### Caller System Logic
- Each caller can handle 4 codes per month
- Only one active campaign per caller
- 48-hour cooling period between campaigns
- Visual status dashboard in Create New form

### Code Validation
- Server validation automatically logs submissions and revenue
- Invalid/expired codes show error messages
- Bill amount displayed on results page when validated by server

### Google Sheets Integration (Backend)
- Each code creates/updates one row in Google Sheet
- Shows: Code, Discount, Restaurant, Submissions, Total Revenue
- Updates automatically as servers validate codes

## Backend

Production-ready backend is now available! See `backend/` folder.

### Backend Stack
- **Node.js** + **Express** - Server framework
- **MongoDB** + **Mongoose** - Database
- **JWT** - Authentication
- **Backblaze B2** - File storage for logos
- **bcryptjs** - Password hashing

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
npm install
```

2. Create `.env` file (see `backend/SETUP.md` for details)

3. Set up MongoDB and Backblaze B2

4. Seed initial data:
```bash
npm run seed
```

5. Start backend server:
```bash
npm run dev
```

See `backend/README.md` and `backend/SETUP.md` for complete setup instructions.

### Next Steps

- [ ] Connect frontend to backend API (replace mockData service)
- [ ] Implement Stripe for caller subscriptions
- [ ] Add Google Sheets API integration

## Built With

- React 18
- React Router v6
- Vite
- CSS3 (Mobile-first design)

## Design System

- Background: Black (#000000)
- Accent: Red/Coral (#ff6b6b)
- Text: White (#ffffff)
- Typography: Uppercase, wide letter spacing
- Buttons: Circular submit buttons with red outline
