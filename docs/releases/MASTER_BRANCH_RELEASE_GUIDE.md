# Master Branch Release Guide — TaskSyncEnterprise

## Overview
This guide specifies the procedure for promoting release candidate branches from `develop` to `master` after Phase 4 final certification.

---

## 🚀 Pre-Merge Verification Checklist

Before merging `develop` into `master`:

1. **Automated Test Gates**:
   - Backend unit suite: `pytest tests/` (286 passed)
   - Frontend UTF-8 check: `npm run check:utf8`
   - Frontend typecheck: `npm run typecheck`
   - Frontend linter: `npm run lint`
   - Frontend unit/contract tests: `npm run test`
   - Frontend production build: `npm run build`
2. **Database Integrity**:
   - `alembic heads` shows single head `7b31f6e4c2a0`
   - `alembic check` returns no pending model changes
3. **Container Health**:
   - Production Docker Compose configuration syntax valid (`docker compose -f docker-compose.production.yml config`)
   - All services (nginx, backend, frontend, sqlserver, redis) pass health checks
4. **Clean Repository State**:
   - No untracked `.log` or demo image files
   - `.env` files untracked and excluded in `.gitignore`

---

## 🔀 Step-by-Step Merge Instructions

```bash
# 1. Fetch latest remote state
git fetch origin

# 2. Checkout master branch
git checkout master
git pull origin master

# 3. Fast-forward or non-FF merge develop into master
git merge --no-ff develop -m "release(v4.0.0): finalize Phase 4 enterprise release"

# 4. Tag the release commit
git tag -a v4.0.0 -m "TaskSyncEnterprise Phase 4 Certified Release v4.0.0"

# 5. Push master and tags to remote (Requires Explicit Approval)
# git push origin master --tags
```
