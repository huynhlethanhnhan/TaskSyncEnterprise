# Manual Verification Guide - API Governance (Phase 3.6)

This guide outlines the steps to manually verify the new API Governance components in `TaskSyncEnterprise` using standard shell `curl` commands.

---

## 🚀 1. Start the Application
First, ensure that your local Redis server is running, then launch the FastAPI backend:
```bash
cd backend
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

---

## 🛠️ 2. Verification Steps

### A. API Versioning Validation
Send a request to an unsupported API version prefix (e.g. `/api/v9/`):
```bash
curl -i http://localhost:8000/api/v9/health
```
#### Expected Response
* **Status Code**: `404 Not Found`
* **Headers**: `Content-Type: application/json`
* **JSON Body**:
```json
{
    "success": false,
    "message": "Unsupported API Version",
    "supported_versions": [
        "v1"
    ]
}
```

---

### B. Request Idempotency
Send a mutative request (e.g. `POST` login with invalid credentials to test middleware caching without DB modifications) and supply an `Idempotency-Key` header:
```bash
curl -i -X POST http://localhost:8000/api/v1/auth/login \
  -H "Idempotency-Key: manual-uuid-1111" \
  -F "username=test@company.com" \
  -F "password=wrongpassword"
```

#### Step 1 (First request)
* **Status**: `401 Unauthorized` (or whatever credential state returns).
* **Headers**: Should NOT contain `Idempotency-Cache`.

#### Step 2 (Second request with identical header)
Run the exact same command within 24 hours:
```bash
curl -i -X POST http://localhost:8000/api/v1/auth/login \
  -H "Idempotency-Key: manual-uuid-1111" \
  -F "username=test@company.com" \
  -F "password=wrongpassword"
```
* **Status**: Should match the first response (`401 Unauthorized`).
* **Headers**: Will contain:
  ```http
  Idempotency-Cache: HIT
  X-Idempotency-Cache: HIT
  ```

---

### C. Rate Limiting
To test rate limiting, lower the limits temporarily in `.env` or query the endpoint rapidly. By default, the limit is `100` requests per `60` seconds. You can trigger it by executing:
```bash
# Loop 101 times quickly
for i in {1..101}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/v1/health; done
```

#### Expected Output
* The first 100 requests will print `200`.
* The 101st request will print `429`.
* Inspecting a single blocked request:
  ```bash
  curl -i http://localhost:8000/api/v1/health
  ```
  Returns:
  * **Status Code**: `429 Too Many Requests`
  * **Headers**:
    ```http
    Retry-After: 59
    X-RateLimit-Limit: 100
    X-RateLimit-Remaining: 0
    ```
  * **Body**:
    ```json
    {
        "success": false,
        "message": "Too many requests. Please try again later.",
        "error_code": "RATE_LIMIT_EXCEEDED"
    }
    ```

---

### D. API Deprecation Headers
To verify deprecation headers manually, you can temporarily attach the `@deprecate_endpoint` decorator to a test route in `app/routers/v1/health.py`:
```python
from app.middleware.deprecation import deprecate_endpoint

@router.get("/health", deprecated=True)
@deprecate_endpoint(sunset="Tue, 01 Jan 2028 00:00:00 GMT", link="https://company.docs/api/v2")
def check_health():
    ...
```
Query the endpoint:
```bash
curl -i http://localhost:8000/api/v1/health
```

#### Expected Headers
* `Deprecation: true`
* `Sunset: Tue, 01 Jan 2028 00:00:00 GMT`
* `Link: https://company.docs/api/v2`
