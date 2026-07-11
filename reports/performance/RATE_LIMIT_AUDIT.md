# Rate Limiter Infrastructure Audit (Phase 3.6)

This audit documents the state of the rate-limiting infrastructure for `TaskSyncEnterprise` and details the implementation plan for our new Redis-based sliding window rate limiter.

---

## 🔍 1. Current State Assessment
* **Findings**: An audit of the codebase confirms that **no rate-limiting mechanism currently exists** in the backend configuration or middleware registry.
* **Gaps**: Without rate limiting, the API endpoints (especially authentication `/login` and heavy query routes) are highly vulnerable to:
  * Brute force credential stuffing attacks.
  * Denial of Service (DoS) attempts resulting from high-frequency endpoint abuse.
  * DB connection pool resource starvation.

---

## 📐 2. Architecture & Design of the New Rate Limiter

To solve this gap without adding bloated dependencies, we implement a custom, highly optimized **Redis Sliding Window Log** rate limiter. Below is the technical audit across crucial governance categories:

### A. Redis Key Strategy
* **Pattern**: `rate_limit:{identifier}:{endpoint}`
* **Identifier**: 
  * Authenticated users: `user_id` (retrieved from JWT context variables).
  * Unauthenticated clients: `ip_address` (fallback using `request.client.host`).
* **Path-Specific Bounds**: Scoped to the specific request path (e.g. `/api/v1/auth/login`) to prevent a request flood on one route from blocking healthy traffic to other endpoints.

### B. Window Algorithm
* **Algorithm**: **Sliding Window Log** using Redis **Sorted Sets (ZSET)**.
* **Mechanism**:
  * Each incoming request adds a unique value (current epoch millisecond timestamp) to a Redis ZSET.
  * Before adding a new request, we prune elements older than the current sliding window: `ZREMRANGEBYSCORE key -inf (current_time - window_size)`.
  * We query the total number of logs in the ZSET using `ZCARD key`.
  * If the count exceeds the limit, the request is rejected with `429 Too Many Requests`.
  * The ZSET TTL is updated to match the window length on every request to ensure garbage collection.

### C. Concurrency Safety
* **Analysis**: Redis operates on a single-threaded execution model, guaranteeing that commands are executed sequentially.
* **Atomic Transactions**: To prevent race conditions between checking the count and writing the new request, the entire process (remove old entries -> add current entry -> check count -> update TTL) is executed inside a Redis **Pipeline** or Lua script block, ensuring absolute concurrency safety.

### D. Memory Usage & Cleanup
* **Memory footprint**: ZSET storage is highly compact. Each entry is a timestamp.
* **Self-Cleanup**:
  * The prune command `ZREMRANGEBYSCORE` automatically cleans up expired requests on every execution.
  * Setting a key TTL ensures that if a client stops sending requests, the ZSET key is automatically dropped from Redis memory.
* **Estimation**: Even under active attack (e.g. 100 requests per client per minute), a ZSET key consumes less than 1KB of Redis memory.

### E. Burst Handling & Token Buckets vs. Sliding Window
* **Comparison**: Fixed-window counters suffer from "boundary bursts" where a client can consume twice the allowed limit if they send requests right at the window boundary.
* **Sliding Window Log Benefit**: The sliding window log enforces a strictly rolling limit, preventing boundary bursts and handling traffic spikes safely and predictably.

---

## 🛠️ 3. Proposed Rate Limiter Middleware Specs

* **Response Headers**:
  * `X-RateLimit-Limit`: Maximum requests allowed in the window.
  * `X-RateLimit-Remaining`: Remaining request allowance in the current window.
  * `Retry-After`: For 429 errors, the exact number of seconds the client must wait before retrying.
* **JSON Error Format**:
  ```json
  {
      "success": false,
      "message": "Too many requests. Please try again later.",
      "error_code": "RATE_LIMIT_EXCEEDED"
  }
  ```
