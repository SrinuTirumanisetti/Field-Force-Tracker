# Research: Real-Time Location Tracking Architecture

## 1. Technology Comparison

### A. WebSockets (The "Phone Call")
*   **How it works:** Keeps a two-way connection open constantly.
*   **Pros:** Fast, instant communication both ways.
*   **Cons:** Drains battery (keeps radio active), hard to maintain on flaky mobile data.
*   **Verdict:** Overkill for 30-second updates.

### B. Server-Sent Events / SSE (The "Radio Broadcast")
*   **How it works:** The server pushes updates to the dashboard. The dashboard just listens.
*   **Pros:** Very simple, uses standard HTTP, reconnects automatically.
*   **Cons:** One-way only (Server → Client).
*   **Verdict:** Perfect for "watching" a map.

### C. Managed Services like Firebase (The "Expensive Consultant")
*   **How it works:** You pay Google to handle the database and syncing.
*   **Pros:** Zero setup, works instantly.
*   **Cons:** **Very Expensive** at scale. 10,000 users = Millions of writes/day = $$$$.
*   **Verdict:** Good for prototypes, bad for our budget.

---

## 2. Recommendation

**I recommend: HTTP POST + Server-Sent Events (SSE).**

### Why?
1.  **Mobile (Ingest):** The app sends a standard HTTP request every 30 seconds.
    *   **Battery:** The phone radio can sleep between updates.
    *   **Reliability:** If the network drops, we just retry the request. No complex "reconnection" logic needed.
2.  **Dashboard (Display):** Uses SSE to listen for updates.
    *   **Simple:** It's lightweight and easy for our small team to build.
3.  **Cost:** We run it on our own cheap servers. No per-message fees like Firebase.

---

## 3. Trade-offs

*   **Not "Instant":** Since we update every 30 seconds, the map is always ~30 seconds behind reality. (Acceptable for field force, bad for Uber).
*   **One-Way:** The dashboard can't easily "ping" the employee to ask for an immediate update. We'd need to add push notifications for that.

---

## 4. Implementation Plan

*   **Mobile App:** Collect GPS -> Send `POST /api/location` every 30s.
*   **Backend:**
    1.  Receive Location.
    2.  Save to Database.
    3.  Publish to **Redis** (a fast messaging tool).
*   **Dashboard:** Connect to `GET /api/stream`. When Redis gets a new location, the server pushes it to the map.
