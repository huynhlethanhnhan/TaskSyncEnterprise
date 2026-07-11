# API Deprecation Governance

TaskSyncEnterprise provides a reusable, standard deprecation framework allowing backend engineers to signal endpoint retirement while offering replacement routes to api consumers.

---

## 🛠️ Usage

To deprecate an endpoint, perform two simple actions:

1. Add `deprecated=True` to the FastAPI route definition (this flags Swagger UI).
2. Attach the `@deprecate_endpoint(sunset: str, link: str)` decorator to specify the sunset date and successor version URL.

```python
from app.middleware.deprecation import deprecate_endpoint

@router.post("/old-endpoint", deprecated=True)
@deprecate_endpoint(sunset="Tue, 01 Jan 2028 00:00:00 GMT", link="https://company.docs/api/v2")
def old_endpoint():
    return {"message": "This endpoint is deprecated."}
```

---

## 🧱 Middleware & Response Headers

The `APIDeprecationMiddleware` automatically intercepts outgoing responses. If the matched route contains deprecation metadata, it injects the following standards-compliant HTTP headers:

* `Deprecation`: Always `true`
* `Sunset`: The date when the endpoint will be fully decommissioned (e.g. `Tue, 01 Jan 2028 00:00:00 GMT`).
* `Link`: The URL pointing to the successor documentation/endpoint (e.g. `https://company.docs/api/v2`).

---

## 📡 Example Response Headers

```http
Deprecation: true
Sunset: Tue, 01 Jan 2028 00:00:00 GMT
Link: https://company.docs/api/v2
```
