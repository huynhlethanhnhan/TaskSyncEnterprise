# Manual Docker Hardening Validation Checklist

This checklist provides SREs and DevOps Engineers with step-by-step commands to verify the security posture and operational integrity of the hardened production Docker image.

---

## 📋 1. Dockerfile Build Audits
*   [ ] **No-Cache Clean Build:** Run a clean build and verify there are no compilation failures:
    ```bash
    docker build --no-cache -t tasksync-backend:prod ./backend
    ```
*   [ ] **Layer Cache Verification:** Re-run the build to confirm caching layers trigger correctly:
    ```bash
    docker build -t tasksync-backend:prod ./backend
    ```

---

## 🏃 2. Runtime Integrity Checks
*   [ ] **Clean Container Launch:** Start the container in testing mode to bypass active DB/Redis connections:
    ```bash
    docker run -d --name tasksync-backend-val -p 8002:8000 -e ENVIRONMENT=testing tasksync-backend:prod
    ```
*   [ ] **Unprivileged User Verification:** Confirm that the process does not run as `root`:
    ```bash
    docker exec tasksync-backend-val id
    ```
    *Verification:* Output must display `uid=10001(tasksync) gid=10001(tasksync)`.
*   [ ] **Filesystem Isolation Audit:** Check that root filesystem writes are locked down, but logs and uploads folders are writable:
    ```bash
    # Test that writing to root folder is blocked
    docker exec tasksync-backend-val touch /app/root_write_test && echo "FAIL: root is writable" || echo "PASS"
    
    # Test that writing to logs folder succeeds
    docker exec tasksync-backend-val touch /app/logs/write_test && echo "PASS" || echo "FAIL: logs not writable"
    
    # Test that writing to uploads folder succeeds
    docker exec tasksync-backend-val touch /app/uploads/write_test && echo "PASS" || echo "FAIL: uploads not writable"
    ```

---

## 🩺 3. Health & Observability Verifications
*   [ ] **API Responsiveness check:** Request the live endpoint from the host:
    ```bash
    curl -i http://localhost:8002/health/live
    ```
    *Verification:* Status `200 OK` with JSON `{"status":"alive"}` and OWASP security headers.
*   [ ] **Container SRE Health Check:** Check SRE probe status:
    ```bash
    docker inspect --format='{{json .State.Health}}' tasksync-backend-val
    ```
    *Verification:* Status should be `healthy`.

---

## 🛑 4. Graceful Shutdown & Cleanup
*   [ ] **Graceful Process Stop:** Stop the container and check that it stops gracefully:
    ```bash
    docker stop tasksync-backend-val
    ```
*   [ ] **Cleanup:** Remove the validation container:
    ```bash
    docker rm tasksync-backend-val
    ```
