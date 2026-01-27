# Unolo Field Force Tracker

A web application for tracking field employee check-ins at client locations with real-time distance calculation and comprehensive reporting.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express.js, SQLite
- **Authentication:** JWT

## Features

### Core Features
- ✅ Employee check-in/checkout at client locations
- ✅ Manager dashboard with team activity monitoring
- ✅ Employee dashboard with personal statistics
- ✅ Check-in history with filtering
- ✅ Role-based access control (Manager/Employee)

### New Features
- ✅ **Real-time Distance Calculation** - Calculates distance between employee and client location using Haversine formula
- ✅ **Distance Warning** - Alerts when employee is >500m from client location
- ✅ **Daily Summary Reports** - Comprehensive team activity reports for managers

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm run setup    # Installs dependencies and initializes database
cp .env.example .env
npm run dev
```

Backend runs on: `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

### Test Credentials

| Role     | Email              | Password    |
|----------|-------------------|-------------|
| Manager  | manager@unolo.com | password123 |
| Employee | rahul@unolo.com   | password123 |
| Employee | priya@unolo.com   | password123 |

## Project Structure

```
├── backend/
│   ├── config/          # Database & utility configuration
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API routes
│   ├── scripts/         # Database init scripts
│   └── server.js        # Express app entry
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   └── utils/       # API helpers
│   └── index.html
└── database/            # SQL schemas (reference only)
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/me` - Get current user profile

### Check-ins
- `GET /api/checkin/clients` - Get assigned clients for employee
- `POST /api/checkin` - Create check-in (includes distance calculation)
  - Body: `{ client_id, latitude, longitude, notes }`
  - Returns: `{ id, distance_from_client, message }`
- `PUT /api/checkin/checkout` - Checkout from current location
- `GET /api/checkin/history` - Get check-in history with optional date filters
  - Query params: `start_date`, `end_date` (YYYY-MM-DD)
- `GET /api/checkin/active` - Get active check-in for current user

### Dashboard
- `GET /api/dashboard/stats` - Manager team statistics (requires manager role)
- `GET /api/dashboard/employee` - Employee personal statistics

### Reports (New)
- `GET /api/reports/daily-summary` - Daily team activity summary (requires manager role)
  - Query params: `date` (required, YYYY-MM-DD), `employee_id` (optional)
  - Returns: Team summary and per-employee breakdown with check-ins, hours, clients visited

## Architecture Decisions

### Distance Calculation
- **Haversine Formula**: Used for calculating great-circle distance between two coordinates
- **Location**: Utility function in `backend/config/distance.js`
- **Storage**: Distance stored in `distance_from_client` column (DECIMAL 10,2) in kilometers
- **Calculation**: Performed server-side during check-in to ensure accuracy
- **Warning Threshold**: 500 meters (0.5 km) triggers warning on frontend

### Daily Summary Report
- **Efficient Query**: Single SQL query with LEFT JOINs to avoid N+1 problem
- **Data Processing**: Server-side aggregation for better performance
- **Authorization**: Manager-only access via `requireManager` middleware
- **Filtering**: Supports date (required) and employee_id (optional) filters
- **Response Format**: Includes team-level summary and per-employee breakdown

### Security Improvements
- **JWT Token**: Removed sensitive data (password hash) from token payload
- **SQL Injection Prevention**: All queries use parameterized statements
- **Password Hashing**: bcrypt with proper async/await handling
- **Role-Based Access**: Middleware enforces manager/employee permissions

### Database Design
- **SQLite**: Suitable for development and small-scale deployments
- **Indexes**: Added on `employee_id` and `checkin_time` for query performance
- **Foreign Keys**: Enforced for data integrity
- **Schema**: Well-normalized with clear relationships

## Bug Fixes

All bugs from the original codebase have been fixed. See `BUG_FIXES.md` for detailed documentation of:
- Authentication issues (missing await, JWT security)
- SQL injection vulnerabilities
- Frontend crashes and incorrect role checks
- Database column name mismatches

## Notes

- The database uses SQLite - no external database setup required
- Run `npm run init-db` to reset the database to initial state
- Distance calculations use the Haversine formula for accuracy
- All API endpoints use proper HTTP status codes (400 for validation, 403 for authorization, etc.)
- Frontend includes real-time distance display and warnings
