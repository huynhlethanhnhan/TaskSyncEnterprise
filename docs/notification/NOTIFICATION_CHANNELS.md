# Notification Channels Strategy Reference

This document maps and explains the available notification delivery channels.

---

## 🛠️ 1. Supported Channels

| Channel | Code Symbol | Description | DB Table Column |
| :--- | :--- | :--- | :--- |
| **Email** | `EMAIL` | Sends responsive HTML/text emails via SMTP. | `"EMAIL"` |
| **In-App** | `IN_APP` | Caches notification in database for application feed retrieval. | `"IN_APP"` |
| **WebSocket** | `WEBSOCKET` | Pushes messages real-time to active user sockets. | `"WEBSOCKET"` |
| **System** | `SYSTEM` | Appends alert telemetries directly to stdout server logs. | `"IN_APP"` (Mapped to protect check constraints) |

---

## 📂 2. Core Channels Implementation

### 1. Email Strategy (`EmailChannel`)
* Maps recipient ID to employee profiles to fetch emails.
* Connects to configured SMTP server.
* Invokes `EmailService` which templates the output based on event type.

### 2. In-App Strategy (`InAppChannel`)
* Persists metadata records directly into `notifications` database table.
* Marks state to `SENT` immediately so the client can pull it via `/notifications` endpoints.

### 3. WebSocket Strategy (`WebSocketChannel`)
* Checks if `WebSocketConnectionManager` contains any active socket handles for the recipient.
* Pushes JSON payload containing notification metadata.
* Always registers state to `SENT` in DB since it completes the real-time push attempt.

### 4. System Strategy (`SystemChannel`)
* Outputs formatted alert logs to the Python console logger.
* To comply with check constraints of the database schemas, the dispatcher writes the notification record as `"IN_APP"`.

---

## 🔮 3. Future Channel Placeholders

* **`PUSH`**: Mobile notification pushes using Apple APNS or Google FCM. Currently registered as a simulated strategy logging to stdout.
* **`SMS`**: Text message delivery adapter placeholder.
* **`SLACK` / `TEAMS`**: Chat webhook integration placeholders.
