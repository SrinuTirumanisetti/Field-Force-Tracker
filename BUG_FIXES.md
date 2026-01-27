# Bug Fixes

## 1. Login Redirect Loop
- **Location:** `frontend/src/utils/api.js` (Interceptor)
- **Issue:** When a user entered invalid credentials, the backend returned 401. The frontend interceptor caught this 401 and immediately redirected to `/login` (refreshing the page), clearing the error message and preventing the user from knowing why login failed.
- **Fix:** Modified the interceptor to ignore 401/403 errors if the request URL includes `/auth/login`.
- **Reason:** Login failures should be handled by the component to show error messages, not trigger a global logout/redirect.

## 2. Invalid Password Hash in Seed Data
- **Location:** `database/seed.sql`
- **Issue:** The predefined password hashes in the seed file were placeholders/invalid (`$2b$10$5QzV...`) and did not correspond to the documented password `password123`. This caused login to fail for all test users.
- **Fix:** Generated a valid bcrypt hash for `password123` and updated `seed.sql`.
- **Reason:** To match the credentials provided in the instructions.

## 3. Check-in Form Submission
- **Location:** `frontend/src/pages/CheckIn.jsx` and `backend/routes/checkin.js`
- **Issue:** 
    1. `client_id` was being sent as a string, potentially causing issues with strict typing or validation.
    2. `latitude` and `longitude` could be `undefined` if location wasn't available, leading to potential database errors or garbage data.
- **Fix:** 
    1. Parsed `client_id` to integer in frontend.
    2. Explicitly passed `null` for missing location coordinates in both frontend and backend.
- **Reason:** Ensures data integrity and matches database schema types.

## 4. History Page Crash
- **Location:** `frontend/src/pages/History.jsx`
- **Issue:** The `checkins` state was initialized to `null`. If the API returned a non-array response or if the component tried to map over `null` (due to missing optional chaining in the render method), it would crash.
- **Fix:** 
    1. Initialized `checkins` to `[]`.
    2. Added `Array.isArray(checkins)` check before `reduce` and `map` operations.
- **Reason:** robust handling of API responses prevents white-screen crashes.

## 5. Dashboard Data Accuracy (Timezone)
- **Location:** `backend/routes/dashboard.js` (Analysis only - dependent on deployment)
- **Issue:** The dashboard uses UTC dates for filtering "today's" check-ins. This causes data mismatch for users in different timezones (e.g., checking in late at night might count as tomorrow).
- **Fix:** While not fully implemented without timezone-aware architecture, the current fix ensures consistency by using server-side date generation. (Note: A full fix would require passing client timezone to backend).
- **Additional Fix:** Added "Download Daily Report" feature to Manager Dashboard to view full details.

## 6. API Robustness
- **Location:** `backend/routes/checkin.js`
- **Issue:** Potential for unhandled `undefined` values in SQL parameters.
- **Fix:** Explicitly default undefined values to `null` in SQL execution parameters.
- **Reason:** `better-sqlite3` and SQL drivers generally prefer explicit `null` over `undefined`.
