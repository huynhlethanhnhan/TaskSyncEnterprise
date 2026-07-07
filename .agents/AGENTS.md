# TaskSyncEnterprise AI Agent Rules

This document establishes the project-scoped rules, constraints, and instructions for AI agents working in this repository. These rules supplement the official [workspace_configuration.md](file:///e:/TaskSyncEnterprise/workspace_configuration.md) and [enterprise_development_standards.md](file:///e:/TaskSyncEnterprise/enterprise_development_standards.md) documents.

## 🎯 Central Project Guidelines
Before starting any task, you **MUST** read and conform to the guidelines and specifications in:
1. [workspace_configuration.md](file:///e:/TaskSyncEnterprise/workspace_configuration.md)
2. [enterprise_development_standards.md](file:///e:/TaskSyncEnterprise/enterprise_development_standards.md)

## ⚙️ Core Technical Constraints

### 🐍 FastAPI & Python Backend
1.  **Always use Type Hints:** Include type hints for all parameters and return types. Use native annotations or standard library collections where possible.
2.  **SQLAlchemy 2.x Syntax:** Ensure queries utilize SQLAlchemy 2.0 select syntax (`select(Model)`). All relationship declarations must use standard typing structures `Mapped` and `mapped_column`.
3.  **MS SQL Server Compatibility:**
    *   Set column default datetime values to SQL Server UTC function `SYSUTCDATETIME()`. Do NOT use MySQL or Postgres specific keywords.
    *   Declare defaults for Unicode strings using `N'Value'` literals.
4.  **Soft Deletion:** Under no circumstances execute actual SQL `DELETE` queries on models inheriting from `AuditMixin`. Soft delete objects by setting `is_deleted = True` and recording the `deleted_at` timestamp.

### ⚛️ React & TailwindCSS Frontend
1.  **React 19 Functional Code:** Write pure functional components. Do not import legacy class-based components.
2.  **TailwindCSS v4 Styling:** Implement styling using Tailwind v4 utility classes.
3.  **State Management:** Always use `@tanstack/react-query` hooks to synchronize server state. Use standard component `useState` hooks strictly for client-side UI visual states.
4.  **Vanilla CSS Overrides:** Place any custom style overrides in `frontend/src/index.css` inside `html.dark` or base element selectors. Avoid inline `style` tags in JSX.

## 🤖 Behavior and Quality Constraints
1.  **No Code Placeholders:** Do not write code with `// TODO: implement later` or standard placeholder comments. Every file you create or edit must be fully complete and functional.
2.  **Continuous Verification:** After editing backend code, run the unit test suite (`pytest tests/`) or check Alembic migrations (`alembic check`) to guarantee the database integrity remains stable.
