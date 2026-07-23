# TaskSyncEnterprise — Phase 4.3 Authentication Runtime Fix Report

**Document Version:** 1.0.0  
**Phase:** Phase 4.3 Authentication Runtime Defect Resolution  

---

## 1. Root Cause Analysis

### Primary Root Cause
`LoginPage.tsx` dispatched `POST /api/v1/auth/login` using a JSON payload (`{ username: email, email, password }`).
FastAPI's authentication endpoint (`auth.py`) expects `OAuth2PasswordRequestForm` as `application/x-www-form-urlencoded` (`username` and `password`).
Because the Content-Type was `application/json`, FastAPI returned `422 Unprocessable Entity`.
The frontend `LoginPage.tsx` caught the HTTP 422 error in a `.catch()` block that swallowed the exception and fallback-initialized a dummy mock access token (`mock-jwt-access-token-1234567890`).
The frontend saved the mock token to `localStorage`, marked `isAuthenticated = true`, and navigated to `/dashboard`.
When the dashboard attempted protected API calls (`GET /api/v1/tasks`, `GET /api/v1/employees`), the backend rejected the mock token with `401 AUTH_UNAUTHORIZED`.

### Secondary Root Cause (Concurrent Refresh Race Condition)
When multiple protected API queries were dispatched concurrently upon page load, a 401 error caused every query to fire `POST /auth/refresh` simultaneously.
The backend revoked the refresh token on the first request, causing subsequent concurrent refresh requests to fail with 401 (`Token đã bị vô hiệu hóa!`) and trigger a force-logout.

### Tertiary Root Cause (Logging Execution Time Anomaly)
High execution times in backend error logs (e.g. `310.5478s`) were caused by Redis connection retries (`REDIS_RETRY_ATTEMPTS = 3`, `socket_timeout = 5s`) stalling RateLimitMiddleware when Redis was offline, combined with non-isolated shared dictionary timing.

---

## 2. Summary of Files Changed

| Component | File Path | Fix Applied |
| :--- | :--- | :--- |
| **Login Form** | `frontend/src/pages/auth/LoginPage.tsx` | Switched payload to `URLSearchParams` (`application/x-www-form-urlencoded`), removed mock fallback swallower, added real error messaging and preserved target route redirect. |
| **Auth Provider** | `frontend/src/providers/AuthProvider.tsx` | Required valid `user` object in `localStorage` alongside access token; cleared invalid state on startup. |
| **Route Guard** | `frontend/src/router/ProtectedRoute.jsx` | Integrated `useAuth()` hook and attached `state={{ from: location }}` to preserve target destination. |
| **API Interceptor** | `frontend/src/api/axios.js` | Implemented `isRefreshing` lock & `failedQueue` to resolve concurrent 401 refresh token race conditions. |
| **Backend Auth Router** | `backend/app/routers/v1/auth.py` | Updated `RefreshToken` lookup to `.scalars().first()` and added explicit active user validation. |
| **JWT Security** | `backend/app/core/security.py` | Added unique `jti` UUID claim to `create_refresh_token` to guarantee distinct token signatures. |
| **Rate Limit Middleware** | `backend/app/middleware/rate_limit.py` | Bypassed rate limiting fast on Redis connection error without blocking HTTP request execution. |
| **Redis Client** | `backend/app/cache/redis_client.py` | Set `socket_connect_timeout` to 0.5s to prevent request stalling when Redis is offline. |
| **Request Context** | `backend/app/middleware/request_context.py` & `backend/app/handlers/exception_handler.py` | Attached `request.state.start_mono` using high-resolution `time.perf_counter()` for accurate request execution timing. |
| **Unit Test Suite** | `backend/tests/test_auth_runtime_fix.py` | Created 6 automated pytest integration tests for DB credentials, login response mapping, bearer headers, 401 handling, and token rotation. |

---

## 3. Verification & Test Execution Results

1. **Administrator Account Status**: Confirmed `admin@gmail.com` exists in the database with matching password `123456`.
2. **Login Endpoint Result**: `POST /api/v1/auth/login` returns `200 OK` with `access_token`, `refresh_token`, `token_type: bearer`, and user profile.
3. **Protected Endpoint Result**: `GET /api/v1/tasks` and `GET /api/v1/employees` return `200 OK` when `Authorization: Bearer <access_token>` is present.
4. **Browser Authorization Header Result**: Axios interceptor dynamically injects `Authorization: Bearer <access_token>` for all protected endpoints.
5. **Refresh Token Result**: Single refresh token rotation succeeds; concurrent 401 queries queue smoothly; revoked token reuse returns `401 Unauthorized`.
6. **Backend Pytest Suite**: `pytest tests/test_auth_runtime_fix.py` — **6 passed in 2.45s**.
7. **Frontend Build & Lint**: `npx eslint "src/**/*.tsx" "src/**/*.ts"` (0 errors), `npm run build` (PASSED 1.32s).
