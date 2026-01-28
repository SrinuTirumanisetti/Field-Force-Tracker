# Unolo Field Force Tracker

A web application for tracking field employee check-ins at client locations.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express.js, SQLite
- **Authentication:** JWT

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
│   ├── config/          # Database configuration
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
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Check-ins
- `GET /api/checkin/clients` - Get assigned clients
- `POST /api/checkin` - Create check-in
- `PUT /api/checkin/checkout` - Checkout
- `GET /api/checkin/history` - Get check-in history
- `GET /api/checkin/active` - Get active check-in

### Dashboard
- `GET /api/dashboard/stats` - Manager stats
- `GET /api/dashboard/employee` - Employee stats

### Reports (New)
- `GET /api/reports/daily-summary` - Get daily summary report (Manager only)

## Notes

- The database uses SQLite - no external database setup required
- Run `npm run init-db` to reset the database to initial state

---

## New Features & Architecture

### 1. Real-time Distance Calculation
- **Logic:** Uses Haversine formula to calculate distance between Employee GPS and Client location.
- **Dual Validation:** Calculated on Frontend (for user warnings) and Backend (for data integrity).
- **Warning:** UI warns if distance > 500m.

### 2. Daily Summary Report
- **Endpoint:** `GET /api/reports/daily-summary`
- **Architecture:** Uses a single optimized SQL query with `LEFT JOIN` to fetch all employee data at once, avoiding the N+1 query problem.
- **Access:** Restricted to Managers only.

### 3. Manager Access Control
- **Decision:** Updated backend logic to allow Managers to view and check in with **all** clients, bypassing the standard employee assignment restrictions.

---

## Testing

Backend unit tests have been added for the new Reports API using **Jest** and **Supertest**.

### Running Tests

```bash
cd backend
npx jest
```

### Test Coverage
- **Validation:** Verifies that missing or invalid parameters return 400.
- **Security:** Verifies that unauthorized users are rejected (403).
- **Functionality:** Verifies that valid requests return the correct data structure.
- **Error Handling:** Verifies that database errors are handled gracefully (500).
