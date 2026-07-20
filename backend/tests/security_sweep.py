# FILE: app/tests/security_sweep.py
import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from fastapi.routing import APIRoute


def get_all_api_routes(routing_container):
    routes = []
    routes_list = (
        routing_container.routes if hasattr(routing_container, "routes") else []
    )
    for route in routes_list:
        if isinstance(route, APIRoute):
            routes.append(route)
        elif type(route).__name__ == "_IncludedRouter" and hasattr(
            route, "original_router"
        ):
            # Starlette/FastAPI route inclusion wrapper
            routes.extend(get_all_api_routes(route.original_router))
        elif hasattr(route, "app") and hasattr(route.app, "routes"):
            routes.extend(get_all_api_routes(route.app))
        elif hasattr(route, "routes"):
            routes.extend(get_all_api_routes(route))
    return routes


def run_security_sweep():
    print("======================================================================")
    print("[AUDIT] FASTAPI ROUTE SECURITY AUDIT SWEEP & IDOR SCANNER")
    print("======================================================================\n")

    unprotected_endpoints = []
    idor_warnings = []
    secured_count = 0

    all_routes = get_all_api_routes(app)

    for route in all_routes:
        # Check standard APIs
        route_methods = route.methods
        dependencies = getattr(route, "dependencies", [])
        endpoint_func = route.endpoint

        # Check if auth helper is declared in route dependencies or path handler arguments
        has_auth_guard = False
        for dep in dependencies:
            dep_str = str(dep.dependency)
            if (
                "get_current_user" in dep_str
                or "require_roles" in dep_str
                or "Require" in dep_str
            ):
                has_auth_guard = True
                break

        # Check default function arguments for Depends annotations
        defaults = endpoint_func.__defaults__ or ()
        for default in defaults:
            if hasattr(default, "dependency"):
                dep_name = str(default.dependency)
                if (
                    "get_current_user" in dep_name
                    or "require_roles" in dep_name
                    or "Require" in dep_name
                ):
                    has_auth_guard = True
                    break

        # Exclude public status endpoints (health check)
        is_public = route.path in {
            "/api/v1/health",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
        }

        if not has_auth_guard and not is_public:
            unprotected_endpoints.append(f"{list(route_methods)} - {route.path}")
        else:
            secured_count += 1

        # Check for potential IDOR (Dynamic route parameters without checks)
        if "{" in route.path and has_auth_guard:
            # If path contains dynamic id parameters (e.g. /tasks/{task_id}) and method is write/update
            has_ownership_validation = False
            # Check source code of route function for check patterns
            import inspect

            try:
                src = inspect.getsource(endpoint_func)
                # Verify if ownership / assignment / creator check is present in function body
                if "current_user" in src and (
                    "employee_id" in src
                    or "requested_by" in src
                    or "is_assigned" in src
                    or "ROLE_ADMIN" in src
                    or "RequireAdmin" in src
                ):
                    has_ownership_validation = True
            except Exception:
                pass

            if not has_ownership_validation and any(
                m in route_methods for m in ["PUT", "POST", "DELETE"]
            ):
                idor_warnings.append(
                    f"{list(route_methods)} - {route.path} (Handler name: {endpoint_func.__name__})"
                )

    # Output scanner findings
    print(f"[PASS] Total Secured API Endpoints: {secured_count}")
    print("\n----------------------------------------------------------------------")
    print("[UNPROTECTED] ENDPOINTS DETECTED (NO AUTH GUARD):")
    print("----------------------------------------------------------------------")
    if unprotected_endpoints:
        for route_str in unprotected_endpoints:
            print(f"  [ALERT] {route_str}")
    else:
        print("  None (All routes secured!)")

    print("\n----------------------------------------------------------------------")
    print("[WARNING] POTENTIAL IDOR / OWNERSHIP CHECK WARNINGS:")
    print("----------------------------------------------------------------------")
    if idor_warnings:
        for route_str in idor_warnings:
            print(f"  [IDOR] {route_str}")
    else:
        print("  None (Ownership checks verified for all write operations!)")

    print("\n======================================================================")
    print("Audit Sweep finished.")
    print("======================================================================")


if __name__ == "__main__":
    run_security_sweep()
