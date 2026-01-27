# Technical Questions

## 1. Scaling to 10,000 Concurrent Users

**What would break first?**
The **SQLite database** would be the primary bottleneck.
- **Write Locking:** SQLite allows only one writer at a time. 10,000 concurrent check-ins would lead to massive contention, `SQLITE_BUSY` errors, and timeouts.
- **Connection Limits:** The Node.js server might run out of file descriptors or connections if not pooled correctly (though SQLite is serverless, the "connection" is a file handle).

**How to fix it?**
1.  **Database Migration:** Move from SQLite to a robust client-server RDBMS like **PostgreSQL** or **MySQL** which supports row-level locking and higher concurrency.
2.  **Queueing System:** Implement a message queue (e.g., RabbitMQ, Redis Streams, or AWS SQS). The API would accept the check-in, push it to the queue, and return "Processing". A separate worker service would drain the queue and write to the DB at a manageable rate.
3.  **Horizontal Scaling:** Run multiple instances of the Node.js backend behind a Load Balancer (Nginx/AWS ALB).

## 2. JWT Security Issue

**The Issue:**
The current implementation issues a JWT with a **24-hour expiration** (`expiresIn: '24h'`) and has **no mechanism to revoke it**.
- If a user is terminated or their device is stolen, they retain access for up to 24 hours.
- Changing the password doesn't invalidate existing tokens.

**Improvement:**
1.  **Short-lived Access Tokens:** Reduce expiry to 15 minutes.
2.  **Refresh Tokens:** Issue a long-lived Refresh Token (stored in HttpOnly cookie). Use it to get new Access Tokens.
3.  **Token Revocation (Blacklist):** When a user logs out or is banned, store the JTI (JWT ID) or the Refresh Token in a fast store like **Redis** with a TTL. Middleware checks this blacklist on every request.

## 3. Offline Check-in Support

**Implementation Strategy:**
1.  **PWA / Service Worker:** Make the React app a Progressive Web App (PWA) so it loads offline.
2.  **Local Storage (IndexedDB):**
    - When offline, store the check-in data (coordinates, timestamp, client_id) in `IndexedDB` or `localStorage` with a flag `synced: false`.
    - Optimistically update the UI to show "Checked In (Pending Sync)".
3.  **Background Sync:**
    - Use the `Background Sync API` (if supported) or a simple `setInterval` / `online` event listener.
    - When connection is restored, iterate through unsynced records and POST them to the backend.
    - On success, mark as synced or remove from local storage.

# Theory/Research Questions

## 4. SQL vs NoSQL

**Recommendation: SQL (PostgreSQL/MySQL)**

**Why?**
1.  **Relational Data:** The domain model is highly relational. Users belong to Managers. Check-ins link to Users and Clients. Clients are assigned to Employees.
2.  **Complex Queries:** The "Daily Summary Report" and Dashboard require complex `JOIN`s and aggregations (COUNT, SUM, GROUP BY). SQL is optimized for this. Doing this in NoSQL (like MongoDB) often requires complex aggregation pipelines or multiple round-trips (application-side joins).
3.  **Data Integrity:** ACID transactions are crucial for attendance data. You don't want a "Check-out" to exist without a "Check-in", or partial writes.

## 5. Authentication vs Authorization

**Authentication (AuthN):** *Verifying who the user is.*
- **Implementation:** `backend/routes/auth.js` (`/login` endpoint). It verifies the email and password against the database and issues a JWT.

**Authorization (AuthZ):** *Verifying what the user is allowed to do.*
- **Implementation:** `backend/middleware/auth.js`.
    - `authenticateToken`: Checks if the user has a valid token (Base access).
    - `requireManager`: Checks `req.user.role === 'manager'` (Role-based access).

## 6. Race Conditions

**Explanation:**
A race condition occurs when the system's behavior depends on the sequence or timing of uncontrollable events (like network requests).

**Identified Race Condition:**
In `backend/routes/checkin.js`:
```javascript
// 1. Read
const [activeCheckins] = await pool.execute('SELECT ... WHERE status = "checked_in"');
// ... logic ...
// 2. Write
await pool.execute('INSERT ...');
```
If a user sends two "Check-in" requests simultaneously (e.g., double-clicking the button):
1.  Request A reads DB -> No active check-in found.
2.  Request B reads DB -> No active check-in found (Request A hasn't written yet).
3.  Request A inserts check-in.
4.  Request B inserts check-in.
**Result:** User has two active check-ins, which violates business logic.

**Prevention:**
1.  **Database Constraint:** Add a unique index on `(employee_id, status)` where status is 'checked_in'. (Tricky if status changes).
2.  **Transactions:** Wrap the Read-Check-Write block in a database transaction with `SERIALIZABLE` isolation or row locking (`SELECT ... FOR UPDATE`).
3.  **Optimistic Locking:** (Not applicable here for Insert, but good for Updates).
