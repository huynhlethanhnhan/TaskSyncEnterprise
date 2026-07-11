# Manual Testing Guide - Phase 3.4 Notification Infrastructure

This guide outlines manual steps, curl requests, and testing scripts to verify WebSocket gateway features, email retries, and delivery strategies.

---

## 📡 1. Testing WebSocket Real-Time delivery

### A. Install wscat
`wscat` is a command-line tool for WebSocket debugging.
```bash
npm install -g wscat
```

### B. Authenticated Connection Test
1. Log in to the application to retrieve an access token:
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -F "username=notify_worker@example.com" \
     -F "password=notifypass"
   ```
2. Connect to the WebSocket gateway using the acquired `access_token` query parameter:
   ```bash
   wscat -c "ws://localhost:8000/ws/notifications?token=<access_token>"
   ```
3. Once connected, type `ping` to test the heartbeat loop. You should receive `pong` back.

### C. Verify Private Notification Push
1. Keep the `wscat` connection open in Terminal A.
2. In Terminal B, trigger a task creation or notification trigger for the user (e.g. approve a vacation or trigger a system event).
3. Observe Terminal A. You should immediately see a JSON push payload:
   ```json
   {
     "id": 12,
     "title": "Vacation Request Approved",
     "message": "Your vacation request was approved by the manager.",
     "channel": "WEBSOCKET"
   }
   ```

---

## 🛡️ 2. Testing Reliability & Email Retries

### A. Simulate SMTP Failure
1. Stop your local SMTP test server or change `SMTP_PORT` in your `.env` to a wrong port (e.g., `8099`) to block outgoing email connections.
2. Trigger an email notification (e.g., login or update a task).
3. Check the database logs table to verify a FAILED entry:
   ```sql
   SELECT * FROM notification_logs WHERE channel = 'EMAIL' AND delivery_status = 'FAILED';
   ```

### B. Verify Background retry
1. With SMTP still blocked, watch the server console. Every 60 seconds, you should see the `EmailRetryPoller` thread pick up the failed notification and attempt resending:
   ```
   [INFO] Retrying failed notification ID 15 (Channel: EMAIL, Previous attempts: 1)
   [WARNING] Transient email delivery failure. Retrying attempt 1/5...
   ```
2. Now, restore the correct SMTP port or start your mail server.
3. On the next poller run, the email will succeed, database status will update to `SENT`, and attempts will stop.
