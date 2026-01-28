# Bug Fixes

## 1. Login Redirect Loop
- **Location:** `frontend/src/utils/api.js` (Line 24)
- **Issue:** The API interceptor checked for `error.response.status === 401` and immediately redirected to `/login`. This caused a page reload loop when a user simply entered a wrong password, preventing the error message from displaying.
- **Fix:** Added a condition to ignore the redirect if the request URL includes `/auth/login`.
- **Reason:** Login failures are expected user errors and should be handled by the UI (showing "Invalid credentials") rather than triggering a global session expiration logout.

## 2. Invalid Password Hash in Seed Data
- **Location:** `database/seed.sql` (Lines 6-9)
- **Issue:** The `password` column for test users contained invalid/placeholder hashes (`$2b$10$5QzV...`) that did not match the documented password `password123`.
- **Fix:** Generated a valid bcrypt hash for `password123` and updated the `INSERT` statements in `seed.sql`.
- **Reason:** Users must be able to log in with the credentials provided in the instructions.

## 3. Check-in Form Submission
- **Location:** `frontend/src/pages/CheckIn.jsx` (Lines 98-100)
- **Issue:** 
    1. The `client_id` was being sent as a string, but the backend expected an integer.
    2. If geolocation failed or was denied, `latitude` and `longitude` were `undefined`, which caused SQL errors when inserting into the database.
- **Fix:** 
    1. Used `parseInt(selectedClient)` to ensure the ID is a number.
    2. Added logic to send `null` explicitly if `location` is falsy: `latitude: location ? location.latitude : null`.
- **Reason:** Ensures data type consistency with the database schema and prevents server-side errors due to missing optional data.

## 4. History Page Crash
- **Location:** `frontend/src/pages/History.jsx` (Lines 5, 45)
- **Issue:** The `checkins` state was initialized to `null`. The render logic tried to map over `checkins` before data was loaded, and the `totalHours` calculation did not check if `checkins` was an array, causing a "Cannot read properties of null" error.
- **Fix:** 
    1. Changed initialization to `useState([])` (empty array).
    2. Added `Array.isArray(checkins)` check before performing `reduce` operations.
- **Reason:** Prevents the "White Screen of Death" by ensuring the component always has a valid array to render, even before API data arrives.

## 5. Manager Client Visibility
- **Location:** `backend/routes/checkin.js` (Lines 14-18)
- **Issue:** The `GET /clients` endpoint strictly filtered clients by `employee_clients` assignments. Since managers aren't assigned specific clients in the join table, they received an empty list and couldn't perform check-ins or view client details.
- **Fix:** Added a check `if (req.user.role === 'manager')` to execute `SELECT * FROM clients` without the employee filter.
- **Reason:** Managers have global oversight and require access to the full client list, unlike restricted employees.

## 6. Checkout 500 Error (SQL Syntax)
- **Location:** `backend/routes/checkin.js` (Lines 113, 122)
- **Issue:** The SQL queries used double quotes for string literals (e.g., `"checked_in"`). In standard SQL, double quotes represent identifiers (like column names), causing SQLite to throw an "Column not found" error.
- **Fix:** Replaced double quotes with single quotes (`'checked_in'`, `'checked_out'`).
- **Reason:** Correct SQL syntax is required for the database driver to interpret string literals correctly.

## 7. Dashboard Reference Error
- **Location:** `frontend/src/pages/Dashboard.jsx` (Lines 29-48)
- **Issue:** The "Download Daily Report" button had an `onClick` handler pointing to `handleDownloadReport`, but this function was undefined in the component.
- **Fix:** Implemented the `handleDownloadReport` function to call the `/reports/daily-summary` endpoint and handle the file download blob.
- **Reason:** Required to make the UI button functional and fulfill the "Daily Summary Report" feature requirement.

## 8. API Robustness (Undefined Values)
- **Location:** `backend/routes/checkin.js` (Lines 88-91)
- **Issue:** If the frontend sent `undefined` for optional fields like `notes` or coordinates, the `better-sqlite3` driver would throw an error because it expects values or `null`.
- **Fix:** Added fallback logic in the SQL parameters: `latitude || null`, `notes || null`.
- **Reason:** Prevents 500 Internal Server Errors when optional data is missing from the request.

## 9. Login Credentials Trimming
- **Location:** `frontend/src/pages/Login.jsx` (Lines 16-17) and `backend/routes/auth.js` (Lines 11-17)
- **Issue:** Leading or trailing spaces in the email or password fields (e.g., from copy-pasting) were treated as part of the credentials, causing "Invalid credentials" errors even when the visible characters were correct.
- **Fix:** Added `.trim()` to both email and password inputs in the frontend `handleSubmit` and the backend `/login` route.
- **Reason:** Prevents accidental whitespace from causing authentication failures, improving user experience.
