# Technical Questions - Answers

## Technical Questions

### 1. If this app had 10,000 employees checking in simultaneously, what would break first? How would you fix it?

**What would break first:**

1. **Database Connection Pool Exhaustion** - SQLite is a file-based database that doesn't handle concurrent writes well. With 10,000 simultaneous check-ins, we'd face:
   - Database lock contention (SQLite locks the entire database for writes)
   - Connection timeouts
   - Write queue buildup

2. **Single Server Bottleneck** - A single Node.js server would struggle with:
   - CPU overload from processing 10,000 requests
   - Memory exhaustion
   - Event loop blocking

3. **Geolocation API Rate Limits** - If using external geocoding services, we'd hit rate limits quickly.

**How to fix it:**

1. **Replace SQLite with PostgreSQL or MySQL**
   - These support concurrent connections and row-level locking
   - Can handle thousands of simultaneous writes
   - Better suited for production workloads

2. **Implement Database Connection Pooling**
   ```javascript
   const pool = mysql.createPool({
       connectionLimit: 100,
       queueLimit: 0,
       waitForConnections: true
   });
   ```

3. **Add Horizontal Scaling**
   - Deploy multiple Node.js instances behind a load balancer (NGINX, AWS ALB)
   - Use PM2 cluster mode for multi-core utilization
   - Implement sticky sessions for WebSocket connections if needed

4. **Implement Caching**
   - Use Redis to cache client locations and user data
   - Reduce database reads by 70-80%
   - Cache frequently accessed data with TTL

5. **Add Message Queue for Async Processing**
   - Use RabbitMQ or AWS SQS for check-in processing
   - Immediate response to user, process in background
   - Better resilience and retry mechanisms

6. **Database Optimization**
   - Add proper indexes (already done for employee_id and checkin_time)
   - Implement database read replicas for reporting queries
   - Use prepared statements (already implemented)

7. **Rate Limiting**
   - Implement per-user rate limiting to prevent abuse
   - Use Redis-based rate limiter (express-rate-limit)

---

### 2. The current JWT implementation has a security issue. What is it and how would you improve it?

**Security Issues Identified:**

1. **No Token Refresh Mechanism** - 24-hour expiry is too long. If a token is stolen, attacker has 24 hours of access.

2. **No Token Revocation** - Once issued, tokens can't be invalidated before expiry (e.g., when user logs out or password changes).

3. **Weak Secret Key** - Uses `process.env.JWT_SECRET || 'default-secret-key'` - the fallback is a major vulnerability.

4. **No Token Rotation** - Same token used for entire session.

5. **Missing Security Headers** - No HTTPS enforcement, CORS could be more restrictive.

**How to improve:**

1. **Implement Refresh Token Pattern**
   ```javascript
   // Short-lived access token (15 minutes)
   const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
   
   // Long-lived refresh token (7 days)
   const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
   
   // Store refresh token in database with user_id
   await pool.execute(
       'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
       [userId, refreshToken, expiresAt]
   );
   ```

2. **Add Token Blacklist/Whitelist**
   - Store active tokens in Redis
   - On logout, remove from whitelist or add to blacklist
   - Check token validity on each request

3. **Enforce Strong Secret**
   ```javascript
   const JWT_SECRET = process.env.JWT_SECRET;
   if (!JWT_SECRET || JWT_SECRET.length < 32) {
       throw new Error('JWT_SECRET must be at least 32 characters');
   }
   ```

4. **Add Token Fingerprinting**
   - Include user agent and IP hash in token
   - Validate on each request to detect token theft

5. **Implement HTTPS Only**
   - Set secure cookie flags
   - Use HSTS headers
   - Reject HTTP requests in production

6. **Add Additional Claims**
   ```javascript
   const token = jwt.sign({
       id: user.id,
       email: user.email,
       role: user.role,
       iat: Date.now(),
       jti: uuidv4() // Unique token ID for revocation
   }, JWT_SECRET, { expiresIn: '15m' });
   ```

---

### 3. How would you implement offline check-in support? (Employee has no internet, checks in, syncs later)

**Implementation Strategy:**

**1. Frontend (Progressive Web App)**

```javascript
// Service Worker for offline support
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// IndexedDB for offline storage
const db = await openDB('field-tracker', 1, {
    upgrade(db) {
        db.createObjectStore('pending-checkins', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('clients', { keyPath: 'id' });
    }
});

// Check-in with offline support
async function handleCheckIn(data) {
    if (navigator.onLine) {
        try {
            const response = await api.post('/checkin', data);
            return response;
        } catch (error) {
            await saveOfflineCheckin(data);
        }
    } else {
        await saveOfflineCheckin(data);
    }
}

async function saveOfflineCheckin(data) {
    const checkin = {
        ...data,
        timestamp: Date.now(),
        synced: false,
        offline: true
    };
    await db.add('pending-checkins', checkin);
    showNotification('Saved offline. Will sync when online.');
}

// Sync when back online
window.addEventListener('online', async () => {
    const pendingCheckins = await db.getAll('pending-checkins');
    
    for (const checkin of pendingCheckins) {
        try {
            await api.post('/checkin', checkin);
            await db.delete('pending-checkins', checkin.id);
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
});
```

**2. Backend Changes**

```javascript
// Add idempotency key to prevent duplicate check-ins
router.post('/', authenticateToken, async (req, res) => {
    const { client_id, latitude, longitude, notes, idempotency_key } = req.body;
    
    // Check if already processed
    const [existing] = await pool.execute(
        'SELECT * FROM checkins WHERE idempotency_key = ?',
        [idempotency_key]
    );
    
    if (existing.length > 0) {
        return res.json({ success: true, data: existing[0], duplicate: true });
    }
    
    // Process check-in with idempotency_key
    // ...
});

// Add conflict resolution for overlapping check-ins
// Use timestamp to determine which check-in is authoritative
```

**3. Database Schema Changes**

```sql
ALTER TABLE checkins ADD COLUMN idempotency_key VARCHAR(255) UNIQUE;
ALTER TABLE checkins ADD COLUMN created_offline BOOLEAN DEFAULT FALSE;
ALTER TABLE checkins ADD COLUMN synced_at TIMESTAMP NULL;
```

**4. Conflict Resolution Strategy**

- **Last Write Wins** - Use timestamp to determine which check-in is valid
- **Server Authoritative** - Server check-ins override offline ones
- **Merge Strategy** - Keep both, mark offline ones with flag

**5. UI Indicators**

- Show sync status (synced, pending, failed)
- Display offline mode indicator
- Show pending check-ins count
- Retry failed syncs manually

---

## Theory/Research Questions

### 4. Explain the difference between SQL and NoSQL databases. For this Field Force Tracker application, which would you recommend and why?

**SQL Databases (Relational)**

**Characteristics:**
- Structured data with predefined schema
- Tables with rows and columns
- ACID compliance (Atomicity, Consistency, Isolation, Durability)
- Relationships via foreign keys
- Strong consistency
- SQL query language
- Vertical scaling (more powerful hardware)

**Examples:** PostgreSQL, MySQL, SQLite, Oracle

**Pros:**
- Data integrity through constraints
- Complex queries with JOINs
- Transactions support
- Mature ecosystem
- Standardized query language

**Cons:**
- Schema changes can be difficult
- Harder to scale horizontally
- Can be slower for simple key-value lookups

---

**NoSQL Databases (Non-Relational)**

**Characteristics:**
- Flexible schema (schema-less or dynamic)
- Various data models (document, key-value, graph, column-family)
- BASE compliance (Basically Available, Soft state, Eventually consistent)
- Horizontal scaling (add more servers)
- Optimized for specific use cases

**Examples:** MongoDB, Redis, Cassandra, DynamoDB

**Types:**
1. **Document** (MongoDB) - JSON-like documents
2. **Key-Value** (Redis) - Simple key-value pairs
3. **Column-Family** (Cassandra) - Wide column stores
4. **Graph** (Neo4j) - Node and relationship based

**Pros:**
- Flexible schema
- Horizontal scalability
- High performance for specific use cases
- Better for unstructured data

**Cons:**
- Eventual consistency (in some cases)
- Less mature for complex transactions
- No standardized query language

---

**Recommendation for Field Force Tracker: SQL (PostgreSQL)**

**Reasons:**

1. **Structured Relational Data**
   - Users, clients, check-ins, and assignments have clear relationships
   - Foreign key constraints ensure data integrity
   - Schema is well-defined and unlikely to change drastically

2. **ACID Transactions Required**
   - Check-in/checkout operations need atomicity
   - Preventing duplicate check-ins requires strong consistency
   - Financial/attendance data requires accuracy

3. **Complex Queries**
   - Daily summary reports require JOINs across multiple tables
   - Aggregations (total hours, client visits) are SQL strengths
   - Filtering by date ranges, employees, clients

4. **Data Integrity**
   - Foreign key constraints prevent orphaned records
   - Ensure employee-client assignments are valid
   - Prevent check-ins for unassigned clients

5. **Reporting Requirements**
   - Manager dashboards need complex aggregations
   - Historical data analysis
   - SQL excels at analytical queries

**When NoSQL Might Be Better:**
- If storing unstructured field notes/photos (use MongoDB for documents)
- If caching is needed (use Redis alongside SQL)
- If real-time location tracking at massive scale (use Cassandra)

**Hybrid Approach:**
- PostgreSQL for core transactional data
- Redis for caching and session management
- S3/MongoDB for file storage (photos, documents)

---

### 5. What is the difference between authentication and authorization? Identify where each is implemented in this codebase.

**Authentication** - "Who are you?"
- Verifying the identity of a user
- Confirming credentials (username/password, token, biometrics)
- Establishing user identity

**Authorization** - "What are you allowed to do?"
- Determining what an authenticated user can access
- Checking permissions and roles
- Enforcing access control

---

**Implementation in This Codebase:**

**Authentication:**

1. **Login Endpoint** (`backend/routes/auth.js:9-56`)
   ```javascript
   router.post('/login', async (req, res) => {
       // Verify email exists
       const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
       
       // Verify password matches
       const isValidPassword = await bcrypt.compare(password, user.password);
       
       // Issue JWT token
       const token = jwt.sign({ id, email, role }, JWT_SECRET);
   });
   ```
   - Authenticates user by verifying email and password
   - Issues JWT token upon successful authentication

2. **Token Verification Middleware** (`backend/middleware/auth.js:5-20`)
   ```javascript
   const authenticateToken = (req, res, next) => {
       const token = authHeader && authHeader.split(' ')[1];
       jwt.verify(token, JWT_SECRET, (err, user) => {
           req.user = user; // Attach authenticated user to request
       });
   };
   ```
   - Verifies JWT token on protected routes
   - Confirms user identity from token

3. **Get Current User** (`backend/routes/auth.js:59-82`)
   ```javascript
   router.get('/me', async (req, res) => {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       // Returns authenticated user's profile
   });
   ```
   - Verifies token and returns user information

**Authorization:**

1. **Manager-Only Middleware** (`backend/middleware/auth.js:22-27`)
   ```javascript
   const requireManager = (req, res, next) => {
       if (req.user.role !== 'manager') {
           return res.status(403).json({ message: 'Manager access required' });
       }
       next();
   };
   ```
   - Authorizes based on user role
   - Restricts access to manager-only resources

2. **Manager Dashboard** (`backend/routes/dashboard.js:8`)
   ```javascript
   router.get('/stats', authenticateToken, requireManager, async (req, res) => {
       // Only managers can access team stats
   });
   ```
   - Requires manager role to view team statistics

3. **Daily Summary Report** (`backend/routes/reports.js:9`)
   ```javascript
   router.get('/daily-summary', authenticateToken, requireManager, async (req, res) => {
       // Only managers can generate reports
   });
   ```
   - Authorizes managers to access reports

4. **Employee-Client Assignment Check** (`backend/routes/checkin.js:34-41`)
   ```javascript
   const [assignments] = await pool.execute(
       'SELECT * FROM employee_clients WHERE employee_id = ? AND client_id = ?',
       [req.user.id, client_id]
   );
   
   if (assignments.length === 0) {
       return res.status(403).json({ message: 'You are not assigned to this client' });
   }
   ```
   - Authorizes employee to check in only at assigned clients
   - Resource-level authorization

5. **Data Filtering by User** (`backend/routes/checkin.js:108`)
   ```javascript
   WHERE ch.employee_id = ?  // Only show user's own check-ins
   ```
   - Implicit authorization - users can only see their own data

6. **Manager Team Filtering** (`backend/routes/dashboard.js:24`)
   ```javascript
   WHERE u.manager_id = ?  // Only show manager's team data
   ```
   - Managers can only see their team's data, not all employees

**Summary:**
- **Authentication** = Login, JWT verification, token validation
- **Authorization** = Role checks (manager/employee), resource ownership, assigned clients

---

### 6. Explain what a race condition is. Can you identify any potential race conditions in this codebase? How would you prevent them?

**What is a Race Condition?**

A race condition occurs when the behavior of software depends on the timing or sequence of uncontrollable events (like thread scheduling, network delays, or concurrent requests). Multiple operations access shared resources concurrently, and the final result depends on the order of execution.

**Example:**
```
User A reads balance: $100
User B reads balance: $100
User A withdraws $50, writes $50
User B withdraws $30, writes $70
Final balance: $70 (should be $20)
```

---

**Potential Race Conditions in This Codebase:**

**1. Duplicate Check-in Race Condition**

**Location:** `backend/routes/checkin.js:44-54`

```javascript
// Check for existing active check-in
const [activeCheckins] = await pool.execute(
    'SELECT * FROM checkins WHERE employee_id = ? AND status = "checked_in"',
    [req.user.id]
);

if (activeCheckins.length > 0) {
    return res.status(400).json({ message: 'You already have an active check-in' });
}

// Insert new check-in
const [result] = await pool.execute(
    'INSERT INTO checkins (...) VALUES (...)',
    [...]
);
```

**Problem:**
If two requests arrive simultaneously:
1. Request A checks - no active check-in
2. Request B checks - no active check-in (A hasn't inserted yet)
3. Request A inserts check-in
4. Request B inserts check-in
5. Result: Two active check-ins for same employee

**How to prevent:**

**Solution 1: Database Transaction with Locking**
```javascript
await pool.execute('START TRANSACTION');
try {
    // Lock the row for this employee
    const [activeCheckins] = await pool.execute(
        'SELECT * FROM checkins WHERE employee_id = ? AND status = "checked_in" FOR UPDATE',
        [req.user.id]
    );
    
    if (activeCheckins.length > 0) {
        await pool.execute('ROLLBACK');
        return res.status(400).json({ message: 'Already checked in' });
    }
    
    await pool.execute('INSERT INTO checkins (...) VALUES (...)', [...]);
    await pool.execute('COMMIT');
} catch (error) {
    await pool.execute('ROLLBACK');
    throw error;
}
```

**Solution 2: Unique Constraint**
```sql
CREATE UNIQUE INDEX idx_active_checkin 
ON checkins(employee_id) 
WHERE status = 'checked_in';
```
Database enforces only one active check-in per employee.

---

**2. Concurrent Checkout Race Condition**

**Location:** `backend/routes/checkin.js:78-90`

```javascript
const [activeCheckins] = await pool.execute(
    'SELECT * FROM checkins WHERE employee_id = ? AND status = "checked_in" ...',
    [req.user.id]
);

await pool.execute(
    'UPDATE checkins SET checkout_time = NOW(), status = "checked_out" WHERE id = ?',
    [activeCheckins[0].id]
);
```

**Problem:**
If user clicks checkout twice rapidly:
1. Request A finds active check-in ID 123
2. Request B finds active check-in ID 123
3. Request A updates ID 123 to checked_out
4. Request B tries to update ID 123 again (already checked out)

**How to prevent:**

```javascript
const [result] = await pool.execute(
    'UPDATE checkins SET checkout_time = NOW(), status = "checked_out" WHERE id = ? AND status = "checked_in"',
    [activeCheckins[0].id]
);

if (result.affectedRows === 0) {
    return res.status(400).json({ message: 'No active check-in found' });
}
```
Add status condition to UPDATE to make it idempotent.

---

**3. Manager Team Data Race Condition**

**Location:** `backend/routes/reports.js:37-56`

**Problem:**
If an employee is reassigned to a different manager during report generation, the data might be inconsistent.

**How to prevent:**

```javascript
await pool.execute('START TRANSACTION');
await pool.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
// Run queries
await pool.execute('COMMIT');
```
Use transaction isolation to ensure consistent snapshot of data.

---

**General Prevention Strategies:**

1. **Database Transactions**
   - Group related operations
   - ACID guarantees

2. **Optimistic Locking**
   - Add version column
   - Check version before update

3. **Pessimistic Locking**
   - Use `SELECT ... FOR UPDATE`
   - Lock rows during transaction

4. **Unique Constraints**
   - Let database enforce uniqueness
   - Better than application-level checks

5. **Idempotency**
   - Design operations to be safely retried
   - Use idempotency keys

6. **Atomic Operations**
   - Use database atomic operations (INCREMENT, etc.)
   - Avoid read-modify-write patterns

7. **Message Queues**
   - Serialize operations through queue
   - Process one at a time

**For this application, I recommend:**
- Add unique constraint for active check-ins
- Use transactions for critical operations
- Implement idempotency keys for offline sync
