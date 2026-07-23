# Phase 4.4 Correction Walkthrough

**Status:** targeted repairs implemented; final runtime walkthrough pending.

1. Reproduced the exact Vietnamese corruption directly in SQL Server.
2. Confirmed source seeds were valid UTF-8 while live columns were VARCHAR.
3. Changed user-facing models to Unicode SQLAlchemy types.
4. Added and applied Alembic migration `7b31f6e4c2a0`.
5. Previewed and applied four exact development seed repairs.
6. Added repository UTF-8 checks and representative serialization/type tests.
7. Replaced the unbundled Inter/Outfit request with one centralized system stack.
8. Found ambiguous `.jsx`/`.tsx` route resolution and locked the router to canonical TSX pages.
9. Reduced shell/sidebar/dashboard dimensions toward the 1280×720 Dashboard reference.
10. Preserved RBAC, Redis circuit-breaker, query, auth, CRUD, and toast code outside the necessary Unicode literal fixes.

The walkthrough is not final because Chrome and Eagle runtime evidence has not been captured. The currently running production backend cannot resolve the SQL Server container due to Docker network separation. Phase 4.4 remains open.
