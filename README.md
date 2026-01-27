# Field Force Tracker

A full-stack application for tracking field employee check-ins, location, and daily reports.

## Setup Instructions

### Prerequisites
- Node.js (v14+ recommended)
- NPM

### Installation

1.  **Install Dependencies**
    ```bash
    # Install backend dependencies
    cd backend
    npm install

    # Install frontend dependencies
    cd ../frontend
    npm install
    ```

2.  **Database Setup**
    The project uses SQLite. You need to initialize the database with the schema and seed data.
    *Note: The seed data has been updated with valid bcrypt hashes for the test users.*

    ```bash
    # From the root directory or backend directory
    cd backend
    npm run seed
    ```

3.  **Running the Application**

    *   **Backend:**
        ```bash
        cd backend
        npm start
        # Runs on http://localhost:3000
        ```

    *   **Frontend:**
        ```bash
        cd frontend
        npm run dev
        # Runs on http://localhost:5173
        ```

### Test Credentials
- **Manager:** `manager@unolo.com` / `password123`
- **Employee:** `employee1@unolo.com` / `password123`

---

## Features Implemented

1.  **Real-time Distance Calculation**
    - Calculates distance between Employee location (from browser) and Client location (from DB) using the Haversine formula.
    - Displays a warning `⚠️ You are far from the client location` if the distance > 500m.
    - Stores the calculated distance in the `checkins` table for historical verification.

2.  **Daily Summary Report (Manager Only)**
    - Managers can download a daily activity report (JSON format) from the Dashboard.
    - Report includes:
        - List of active employees.
        - Total hours worked per employee.
        - Detailed check-in/out logs with distance data.

3.  **Manager Global Access**
    - Managers can now view and check in with **all** clients, not just those explicitly assigned to them in the `employee_clients` table.

---

## API Documentation

### New Endpoints

#### `GET /api/reports/daily-summary`
Generates a summary of check-ins and hours worked for a specific date.

- **Auth Required:** Yes (Manager Role)
- **Query Parameters:**
    - `date` (optional): Date in `YYYY-MM-DD` format. Defaults to current server date.
- **Success Response (200 OK):**
    ```json
    {
      "date": "2023-10-27",
      "total_employees_active": 5,
      "total_hours_logged": 32.5,
      "employee_summaries": [
        {
          "employee_id": 1,
          "name": "John Doe",
          "first_checkin": "09:00:00",
          "last_checkout": "17:00:00",
          "total_hours": 8.0,
          "checkins": [
            {
              "client": "Client A",
              "checkin_time": "09:00:00",
              "distance_km": 0.2
            }
          ]
        }
      ]
    }
    ```

---

## Architecture Decisions

- **Database:** Chosen **SQLite** for zero-configuration deployment and portability, making it ideal for this assignment and local development. The schema uses standard relational patterns with Foreign Keys to ensure data integrity.

- **Backend Pattern:** Used **Controller-Service** pattern (simplified into Routes/Config) to separate concerns. Database logic is wrapped in a Promise-based helper to maintain modern `async/await` syntax while using the efficient `better-sqlite3` driver.

- **Distance Logic (Dual Validation):** Implemented the Haversine formula on both:
    - **Frontend:** For immediate user feedback/warnings.
    - **Backend:** For reliable data storage and validation, ensuring client-side manipulation doesn't corrupt historical data.

- **Reporting Optimization:** Designed the Daily Summary API to use a single optimized SQL query with `LEFT JOIN`s to fetch all data at once. This prevents the "N+1 Query Problem" where the server would otherwise query the database for every single employee.

- **Manager Access Control:** Logic was updated to allow Managers global visibility of clients. While regular employees are restricted to their assigned clients (via `employee_clients` table), Managers bypass this check to ensure they can oversee all operations.

- **Robust Error Handling:**
    - Explicitly handling `undefined` location data by converting to `null` for SQL compatibility.
    - API Interceptors on the frontend to gracefully handle 401/403 errors without causing redirect loops.
