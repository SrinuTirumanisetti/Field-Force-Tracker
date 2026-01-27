# Database Initialization Instructions

## Issue
The backend is returning a 500 error because the database hasn't been initialized yet or is locked by a running process.

## Solution Steps

### 1. Stop the Backend Server
If you have the backend running in a terminal, press **Ctrl+C** to stop it.

### 2. Close Database Viewers
If you have any database viewer applications open (like DB Browser for SQLite), close them.

### 3. Initialize the Database
In the `backend` folder, run:
```bash
npm run init-db
```

This will:
- Create the database file (`database.sqlite`)
- Create all tables (users, clients, checkins, employee_clients)
- Insert seed data with test users and sample check-ins

### 4. Start the Backend
```bash
npm run dev
```

### 5. Test Login
Now you can login with the test credentials:
- **Manager:** manager@unolo.com / password123
- **Employee:** rahul@unolo.com / password123

## What the Database Contains

After initialization, you'll have:
- **4 users** (1 manager, 3 employees)
- **5 clients** in Gurugram/Delhi NCR area
- **7 employee-client assignments**
- **6 sample check-ins** for testing

## Troubleshooting

If you still get "EBUSY" error:
1. Restart your computer (this will close all file handles)
2. Or manually delete `backend/database.sqlite` file
3. Then run `npm run init-db` again
