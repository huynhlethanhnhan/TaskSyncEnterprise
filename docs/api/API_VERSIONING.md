# API Versioning Governance

TaskSyncEnterprise supports strict path-based API versioning validation via middleware.

---

## ⚙️ Configuration
The allowed version strings are defined in the central configuration class:
* **Setting**: `SUPPORTED_API_VERSIONS` (Type: `list[str]`)
* **Default**: `["v1"]`

To register a new supported version, update the configuration or define it in the `.env` file:
```env
SUPPORTED_API_VERSIONS=["v1", "v2"]
```

---

## 🧱 Middleware Architecture
* **Location**: `app.middleware.api_version.APIVersionMiddleware`
* **Flow**:
  1. Inspects all incoming request paths.
  2. Detects version prefixes using the regular expression `^/api/(v\d+)(?:/|$)`.
  3. If a version is parsed (e.g. `v9`) but is not present in the allowed list, the request is immediately rejected without forwarding it to downstream routers.
  4. Root level endpoints (e.g., SRE `/health` probes, landing page `/`) bypass validation.

---

## 📡 Example Response (404 Unsupported Version)

If a client queries `GET /api/v9/tasks`, they receive:

* **Status Code**: `404 Not Found`
* **Body**:
```json
{
    "success": false,
    "message": "Unsupported API Version",
    "supported_versions": [
        "v1"
    ]
}
```
