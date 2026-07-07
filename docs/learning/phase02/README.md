# Phase 02: Database Integrity & Data Foundation
## Backend Learning Course - TaskSync Enterprise V2

Welcome to Phase 2 of the TaskSync Enterprise Backend Learning Course. In the previous phase, we focused on initial setup and core routing. In this phase, we dive deep into the bedrock of any enterprise application: **Database Integrity & Data Foundation**. 

Without a stable, predictable, and correctly constraint-mapped database, business logic layer code becomes complex, error-prone, and impossible to scale. This course acts as your official guide to mastering database architecture, schema migrations, object-relational mapping (ORM) with SQLAlchemy 2.0, and security-hardened authentication.

---

## 🎯 Learning Objectives
By the end of this course, you will be able to:
1. Identify and clean obsolete schemas and duplicate models using the **Single Source of Truth (SSOT)** design pattern.
2. Refactor legacy SQLAlchemy models to modern **SQLAlchemy 2.0 type annotated mapping style** (`Mapped` and `mapped_column`).
3. Enforce **Referential Integrity** using foreign key constraints, default value expressions, and indices directly on MS SQL Server.
4. Program migrations for SQL Server using Alembic, including implementing custom script loops to **dynamically drop default constraints**.
5. Map timezone-independent timelines using high-precision database UTC timestamps (`SYSUTCDATETIME()`).
6. Hardcode Unicode-safe strings using SQL Server string prefix constraints (`N'value'`).
7. Write and adapt Pytest fixtures to run database-agnostic unit tests (porting SQL Server metadata to SQLite in-memory).
8. Implement direct `bcrypt` password hashing to bypass legacy crypto library limitations.

---

## 🧩 Concepts Introduced
* **SQLAlchemy 2.0 Declarative Mapping**: Type annotations replacing implicit Column objects.
* **Referential Integrity & Cascading**: Safeguards that prevent orphan records and corrupt relational links.
* **System Default Constraints**: Database-level default values using SQL-standard and dialect-specific calls (`SYSUTCDATETIME()` vs. `getdate()`).
* **Dynamic Migrations**: Overcoming dialect-specific migration locks (such as default constraint locks on SQL Server).
* **Test Database Schema Rewriting**: Modifying metadata dynamically at test time to allow test code to run on SQLite while production targets SQL Server.
* **Direct Cryptographic Hashing**: Direct usage of `bcrypt` instead of high-level frameworks to eliminate performance bottlenecking.

---

## 🏛️ Architecture Overview

The following diagram illustrates how the business logic layer (FastAPI) interacts with the Database layer (SQLAlchemy and SQL Server) and the Test layer (SQLite):

```text
       +--------------------------------------------+
       |             FastAPI Controllers            |
       +---------------------+----------------------+
                             |
                             v (CRUD operations)
       +---------------------+----------------------+
       |           SQLAlchemy 2.0 ORM Layer         |
       +----------+----------------------+----------+
                  |                      |
    (Production)  |                      | (Unit Tests)
                  v                      v
       +----------+----------+  +--------+----------+
       |   MS SQL Server DB  |  |  SQLite In-Memory |
       |   Schema: dbo       |  |  Schema: None     |
       |   UTC: SYSUTCDATETIME|  |  UTC: CURRENT_TIME|
       +---------------------+  +-------------------+
```

---

## 💼 Business Flow
For an Enterprise HRM and Task Management system, data integrity directly affects core business metrics:
1. **Reporting Structure Integrity**: When an employee profile is created or updated, the database must verify that their manager exists, preventing loops in the reporting hierarchy.
2. **Audit Logging**: Every task creation, status update, or vacation request must record a timestamp in UTC, ensuring that SLA reports are accurate across geographic regions.
3. **Data Protection**: Cleartext passwords must never be persisted. Using robust hashing at insert time shields the database against credential theft.

---

## 🚀 Project Impact
Applying these changes stabilizes the database layer:
* **Zero Orphan Records**: Tasks are bound to projects, assignments to users, and sessions to active tokens.
* **Unified Timezones**: Timestamps across vacations, comments, and task assignments align to UTC.
* **Portable and Clean Tests**: SQLite runs in-memory without schema compatibility errors, keeping CI/CD execution fast.
* **Deterministic Migrations**: Standardized Alembic scripts allow database schema changes to deploy with zero manual database intervention.

---

## 📋 Definition of Done
To pass this phase, the following criteria must be satisfied:
* [x] No duplicate models are left (deletion of `core.py`).
* [x] Modern SQLAlchemy 2.0 syntax applied to all models.
* [x] Datetime column server defaults standardized to `SYSUTCDATETIME()`.
* [x] Status and Priority defaults prefixed with Unicode `N'...'`.
* [x] Custom Alembic migration runs successfully (both `upgrade` and `downgrade` checks pass).
* [x] Dynamic default constraint drops are handled programmatically in the migration script.
* [x] Schema check runs successfully (`alembic check` returns `No changes in schema detected`).
* [x] Unit test suite runs successfully with `pytest`.
* [x] Static directory structures for uploads are pre-initialized dynamically on startup.

---

## 🗺️ Learning Roadmap

```text
 +----------------------------------+
 |    Phase 1: REST API Routing     |  <-- Set up routes and schemas
 +----------------+-----------------+
                  |
                  v
 +----------------+-----------------+
 |  Phase 2: Database Foundation    |  <-- [YOU ARE HERE] Stabilize DB & Migrations
 +----------------+-----------------+
                  |
                  v
 +----------------v-----------------+
 |  Phase 3: Core Business Features  |  <-- Build advanced HR & Task logic
 +----------------------------------+
```
