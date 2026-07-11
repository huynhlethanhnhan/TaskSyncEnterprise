# Backend Application File Tree (Milestone M3)

This tree lists the structured files of the `TaskSyncEnterprise` backend application.

```
backend/
├── Dockerfile                      # Production Dockerfile
├── requirements.txt                # Unified Python dependency definitions
├── alembic.ini                     # Migration settings
├── seed_v2.py                      # Database seeder
├── alembic/                        # Database migration scripts
└── app/
    ├── __init__.py
    ├── main.py                     # App entry point & middleware stacks
    ├── config.py                   # Pydantic configuration definitions
    ├── database/                   # DB engine local setups
    ├── models/                     # SQLAlchemy data models
    ├── schemas/                    # Pydantic parameter validators
    ├── crud/                       # Database query actions
    ├── handlers/                   # Exception handlers
    ├── middleware/                 # API Version, Rate Limit, Idempotency, Deprecation
    ├── routers/                    # Versioned HTTP & WebSocket endpoints
    ├── services/                   # Storage, email, and notification dispatches
    └── utils/                      # Search and query encoders
```
