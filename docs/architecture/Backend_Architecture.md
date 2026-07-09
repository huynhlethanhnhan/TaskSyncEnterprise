# TaskSyncEnterprise V2 Backend Architecture Blueprint

This document details the overall architecture, folder layouts, and system lifecycles of the TaskSyncEnterprise backend.

---

## 1. Overall System Architecture
The backend is structured around a decoupled layers model. Requests enter via the ASGI web server, process through multiple middleware layers, and hit the API routers. The router calls specific database queries or business operations before returning the response.

```mermaid
graph TD
    Client["Client App / Frontend"] -- "HTTP Requests" --> ASGI["Uvicorn ASGI Server"]
    
    subgraph Middlewares
        ASGI --> LogMW["LoggingMiddleware"]
        LogMW --> HostMW["TrustedHostMiddleware"]
        HostMW --> SecMW["SecurityHeadersMiddleware"]
        SecMW --> CORSMW["CORSMiddleware"]
    end
    
    subgraph FastAPI Core
        CORSMW --> Routing["APIRouter Mapping"]
        Routing --> Handlers["Exceptions & Errors Handlers"]
    end
    
    subgraph Business & Data Layer
        Routing --> Models["SQLAlchemy Database Models"]
        Routing --> HealthService["HealthCheckService"]
        Models --> DBEngine["SQLAlchemy Engine (MS SQL Server)"]
    end
    
    subgraph Observability
        LogMW --> ContextVar["contextvars (Request ID)"]
        ContextVar --> Filter["CorrelationIdFilter"]
        Filter --> Rotating["RotatingFileHandlers (app.log, error.log, audit.log)"]
    end
```

---

## 2. Directory Layout & Folder Structure

```
backend/
├── app/
│   ├── config.py              # Central Settings (Pydantic Settings V2)
│   ├── main.py                # App entrypoint & Lifespan configurations
│   ├── database.py            # Session mapping & SQLAlchemy connection setup
│   ├── models/                # SQLAlchemy database models
│   ├── routers/               # APIRouters
│   │   └── v1/
│   │       ├── health.py      # Health checkpoints (Probes)
│   │       └── auth.py        # Authentication
│   ├── core/
│   │   ├── logger.py          # Central logging config & filters
│   │   ├── middleware.py      # HTTP Logging, Security, and Cache Middlewares
│   │   ├── errors.py          # Global exception handlers
│   │   └── exceptions.py      # Custom business exceptions
│   └── services/
│       ├── health_service.py  # Diagnostic check logic & metrics registry
│       └── storage_service.py # Storage management
├── tests/                     # Unit and integration test suites
├── requirements.txt           # Lock dependencies
└── alembic.ini                # Migrations setup
```

---

## 3. Lifecycles & Flow Charts

### Request & Middleware Lifecycle
This diagram illustrates the sequence of middlewares a request passes through:

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Log as LoggingMiddleware
    participant Host as TrustedHostMiddleware
    participant Sec as SecurityHeadersMiddleware
    participant Router as API Router
    
    Client->>Log: Send Request
    Note over Log: Generates & stores Request ID
    Log->>Host: Proceed
    Note over Host: Validates Host header
    Host->>Sec: Proceed
    Sec->>Router: Execute Route Handler
    
    Router-->>Sec: Response
    Note over Sec: Injects OWASP headers & disables API cache
    Sec-->>Host: Response
    Host-->>Log: Response
    Note over Log: Logs latency, status, IP, and user ID
    Log-->>Client: Returns HTTP Response (X-Request-ID)
```

---

### Startup Lifecycle Flow
This diagram details the startup sequence that runs before the FastAPI server begins accepting requests:

```mermaid
graph TD
    Start["1. Initialize Python Process"] --> SetupLog["2. setup_logging() Configured"]
    SetupLog --> Validate["3. validate_startup() Checks run"]
    
    subgraph Validate Checks
        Validate --> PagVal["Check Pagination limits"]
        Validate --> SecVal["Check SECRET_KEY strength"]
        Validate --> DirVal["Check Directory writes permissions"]
        Validate --> DBVal["Check Database ping (3s timeout)"]
    end
    
    DBVal --> Passed["4. Lifespan Boot Log Info"]
    Passed --> Open["5. Server Listening to Requests"]
```

---

### Shutdown Lifecycle Flow
This diagram illustrates how resources are released during a graceful shutdown:

```mermaid
graph TD
    SIGTERM["1. SIGTERM / Shutdown command"] --> Graceful["2. Stop accepting new connections"]
    Graceful --> DBRelease["3. Dispose SQL database pool (engine.dispose())"]
    DBRelease --> FlushLog["4. Flush & Close Log Handlers (logging.shutdown())"]
    FlushLog --> Closed["5. Application process exits cleanly"]
```
