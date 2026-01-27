# Bug Fixes Documentation

This document details all bugs found and fixed in the Field Force Tracker application.

## Backend Bugs

### Bug #1: Missing await in Password Comparison
**File:** `backend/routes/auth.js`  
**Line:** 28  

**What was wrong:**
```javascript
const isValidPassword = bcrypt.compare(password, user.password);
```
The `bcrypt.compare()` function returns a Promise, but it wasn't being awaited. This caused the function to return a Promise object instead of the actual boolean result, making the password comparison always evaluate to truthy (since a Promise object is truthy), which would sometimes cause authentication to fail unpredictably.

**How it was fixed:**
```javascript
const isValidPassword = await bcrypt.compare(password, user.password);
```
Added the `await` keyword to properly wait for the Promise to resolve and get the actual boolean result.

**Why this fix is correct:**
The `bcrypt.compare()` function is asynchronous and returns a Promise<boolean>. Without `await`, the code receives a Promise object instead of the boolean value. Adding `await` ensures we get the actual comparison result (true/false), making login work reliably every time.

---

### Bug #2: Sensitive Data in JWT Token
**File:** `backend/routes/auth.js`  
**Line:** 35  

**What was wrong:**
```javascript
const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, password: user.password },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
);
```
The JWT token payload included the user's password hash and name, which is a serious security vulnerability. JWT tokens are base64 encoded (not encrypted) and can be easily decoded by anyone.

**How it was fixed:**
```javascript
const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
);
```
Removed `password` and `name` from the token payload, keeping only essential identification data.

**Why this fix is correct:**
JWT tokens should only contain non-sensitive identification data needed for authentication and authorization. Including password hashes is a security risk. The name field is unnecessary since it's not used anywhere in the middleware, and can be fetched from the database when needed. This reduces token size and improves security.

---

### Bug #3: Wrong HTTP Status Code for Validation Error
**File:** `backend/routes/checkin.js`  
**Line:** 30  

**What was wrong:**
```javascript
if (!client_id) {
    return res.status(200).json({ success: false, message: 'Client ID is required' });
}
```
Returned HTTP 200 (OK) status code for a validation error, which is semantically incorrect.

**How it was fixed:**
```javascript
if (!client_id) {
    return res.status(400).json({ success: false, message: 'Client ID is required' });
}
```
Changed status code to 400 (Bad Request).

**Why this fix is correct:**
HTTP 400 is the correct status code for client-side validation errors. HTTP 200 should only be used for successful requests. This follows REST API best practices and helps clients properly handle errors.

---

### Bug #4: Incorrect Column Names in INSERT Query
**File:** `backend/routes/checkin.js`  
**Line:** 57  

**What was wrong:**
```javascript
INSERT INTO checkins (employee_id, client_id, lat, lng, notes, status)
VALUES (?, ?, ?, ?, ?, 'checked_in')
```
Used column names `lat` and `lng` which don't exist in the database schema.

**How it was fixed:**
```javascript
INSERT INTO checkins (employee_id, client_id, latitude, longitude, notes, status)
VALUES (?, ?, ?, ?, ?, 'checked_in')
```
Changed to correct column names `latitude` and `longitude` to match the schema.

**Why this fix is correct:**
The database schema (schema.sql) defines the columns as `latitude` and `longitude`, not `lat` and `lng`. Using incorrect column names would cause SQL errors and prevent check-ins from being saved. This fix ensures the INSERT query matches the actual database structure.

---

### Bug #5: SQL Injection Vulnerability
**File:** `backend/routes/checkin.js`  
**Lines:** 113-116  

**What was wrong:**
```javascript
if (start_date) {
    query += ` AND DATE(ch.checkin_time) >= '${start_date}'`;
}
if (end_date) {
    query += ` AND DATE(ch.checkin_time) <= '${end_date}'`;
}
```
Used string concatenation to build SQL queries with user input, creating a SQL injection vulnerability.

**How it was fixed:**
```javascript
if (start_date) {
    query += ` AND DATE(ch.checkin_time) >= ?`;
    params.push(start_date);
}
if (end_date) {
    query += ` AND DATE(ch.checkin_time) <= ?`;
    params.push(end_date);
}
```
Changed to use parameterized queries with placeholders (`?`) and added parameters to the params array.

**Why this fix is correct:**
Parameterized queries prevent SQL injection attacks by ensuring user input is properly escaped and treated as data, not executable SQL code. This is a critical security fix that protects the application from malicious input.

---

### Bug #6: Checkout Query Not Filtering by Status
**File:** `backend/routes/checkin.js`  
**Line:** 79  

**What was wrong:**
```javascript
const [activeCheckins] = await pool.execute(
    'SELECT * FROM checkins WHERE employee_id = ? ORDER BY checkin_time DESC LIMIT 1',
    [req.user.id]
);
```
The checkout query fetched the most recent check-in without filtering by status, potentially checking out an already checked-out record.

**How it was fixed:**
```javascript
const [activeCheckins] = await pool.execute(
    'SELECT * FROM checkins WHERE employee_id = ? AND status = "checked_in" ORDER BY checkin_time DESC LIMIT 1',
    [req.user.id]
);
```
Added `AND status = "checked_in"` to only fetch active check-ins.

**Why this fix is correct:**
Checkout should only affect active (checked_in) records. Without the status filter, the query could return an already checked-out record, leading to incorrect data. This ensures we only checkout active check-ins.

---

## Frontend Bugs

### Bug #7: History Page Crash on Load
**File:** `frontend/src/pages/History.jsx`  
**Line:** 45  

**What was wrong:**
```javascript
const totalHours = checkins.reduce((total, checkin) => {
    // ... calculation
}, 0);
```
Called `.reduce()` on `checkins` without checking if it's null or undefined, causing the page to crash when checkins hasn't been loaded yet.

**How it was fixed:**
```javascript
const totalHours = checkins?.reduce((total, checkin) => {
    // ... calculation
}, 0) || 0;
```
Added optional chaining (`?.`) and fallback value (`|| 0`).

**Why this fix is correct:**
On initial render, `checkins` is `null` (as set in useState). Calling `.reduce()` on null throws an error. Optional chaining safely handles null/undefined values, and the fallback ensures we always have a valid number. This prevents the crash and allows the page to render properly.

---

### Bug #8: Dashboard Using Hardcoded User ID
**File:** `frontend/src/pages/Dashboard.jsx`  
**Line:** 15  

**What was wrong:**
```javascript
const endpoint = user.id === 1 ? '/dashboard/stats' : '/dashboard/employee';
```
Used hardcoded `user.id === 1` to determine if user is a manager, which only works for the first user in the database.

**How it was fixed:**
```javascript
const endpoint = user.role === 'manager' ? '/dashboard/stats' : '/dashboard/employee';
```
Changed to check `user.role === 'manager'` instead.

**Why this fix is correct:**
Role-based access should be determined by the user's role field, not their ID. Hardcoding ID 1 breaks for any other manager users. Using the role field is the correct, scalable approach that works for all managers regardless of their ID.

---

### Bug #9: Missing Form Submit Prevention
**File:** `frontend/src/pages/CheckIn.jsx`  
**Line:** 58  

**What was wrong:**
```javascript
const handleCheckIn = async (e) => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    // ... rest of function
}
```
The form submit handler didn't call `e.preventDefault()`, causing the page to reload on form submission.

**How it was fixed:**
```javascript
const handleCheckIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    // ... rest of function
}
```
Added `e.preventDefault()` at the beginning of the handler.

**Why this fix is correct:**
In React, form submissions trigger a page reload by default. Calling `e.preventDefault()` prevents this default behavior, allowing the async API call to complete and the UI to update properly without a page refresh. This is standard practice for handling forms in React.

---

## Summary

**Total Bugs Fixed:** 9

- **Backend:** 6 bugs (authentication, validation, SQL injection, database schema mismatch)
- **Frontend:** 3 bugs (null handling, role-based access, form submission)

All bugs have been tested and verified to be fixed. The application now works reliably with proper security, error handling, and user experience.
