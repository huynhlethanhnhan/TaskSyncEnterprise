# Notification Infrastructure Review Report (Phase 3.4)

This report presents a technical audit of the notification infrastructure in `TaskSyncEnterprise`, analyzing delivery channels, database constraints, user preference mechanisms, and reliability.

---

## 🏛️ 1. Notification Engine Architecture

The system implements a decoupled, event-driven architecture utilizing the **Strategy Pattern** for delivery:
1. **Core Service** ([notification_service.py](file:///e:/TaskSyncEnterprise/backend/app/services/notification_service.py)): Acts as a facade to create and trigger `NotificationEvent` schemas.
2. **Dispatcher** ([dispatcher.py](file:///e:/TaskSyncEnterprise/backend/app/services/notification/dispatcher.py)):
   * Receives events.
   * Interpolates templates via the `NotificationFormatter`.
   * Resolves target employee notification preferences.
   * Persists database records (Status: `PROCESSING`).
   * Fetches corresponding channel adapter strategies and executes delivery.
3. **Registry** ([registry.py](file:///e:/TaskSyncEnterprise/backend/app/services/notification/registry.py)): Manages registered channels: `InAppChannel`, `EmailChannel`, `WebSocketChannel`, `PushChannel`.

---

## 💾 2. Database Models & Schema Check Constraints

We audited the three core notification tables:
1. **`notifications`** ([notification.py](file:///e:/TaskSyncEnterprise/backend/app/models/notification.py)):
   * Priority constraint: `LOW`, `NORMAL`, `HIGH`, `CRITICAL`.
   * Status constraint: `PENDING`, `PROCESSING`, `SENT`, `FAILED`, `READ`, `ARCHIVED`.
   * Channel constraint: `IN_APP`, `EMAIL`, `WEBSOCKET`, `PUSH`, `SMS`, `SLACK`, `TEAMS`.
2. **`notification_preferences`** ([notification_preference.py](file:///e:/TaskSyncEnterprise/backend/app/models/notification_preference.py)):
   * Channel constraint: `IN_APP`, `EMAIL`, `WEBSOCKET`, `PUSH`, `SMS`, `SLACK`, `TEAMS`.
3. **`notification_logs`** ([notification_log.py](file:///e:/TaskSyncEnterprise/backend/app/models/notification_log.py)):
   * Channel constraint: `IN_APP`, `EMAIL`, `WEBSOCKET`, `PUSH`, `SMS`, `SLACK`, `TEAMS`.

### ⚠️ Crucial Constraint Finding
* The database schemas restrict `channel` strictly to: `IN_APP`, `EMAIL`, `WEBSOCKET`, `PUSH`, `SMS`, `SLACK`, `TEAMS`.
* **"SYSTEM" is not present** in the database check constraints. Attempting to write a notification with `channel="SYSTEM"` will cause a CheckConstraint violation crash.
* **Mitigation**: We will add `SYSTEM` to the `NotificationChannel` enum but map it to save as `"IN_APP"` in the database (since system alerts appear inside the application feed), while dispatching it using the `SystemChannel` strategy in python memory.

---

## 📡 3. WebSocket Real-Time delivery Status
* **Current State**: The `WebSocketChannel` in [websocket.py](file:///e:/TaskSyncEnterprise/backend/app/services/notification/channels/websocket.py) is a **mock simulation placeholder** that prints log lines and marks the notification as immediately `SENT`.
* **Gaps**:
  * No real WebSocket server endpoint.
  * No WebSocket connection registry or manager to track active online sessions.
  * No token validation/authentication.

---

## ✉️ 4. Email Reliability & Retry Policies
* **Current State**: `EmailService` ([service.py](file:///e:/TaskSyncEnterprise/backend/app/services/email/service.py)) implements an exponential backoff retry loop (`send_email_with_retry`) up to 3 times for transient errors.
* **Gaps**:
  * If the network is fully down or SMTP is unreachable during the initial request, the email retry exhausted error is logged and the notification remains `FAILED`.
  * No secondary retry queue or periodic database scanning mechanism exists to retry failed emails later, creating a risk of lost alerts.
