# Enterprise Notification Architecture

This document describes the design and orchestration pipeline of the `TaskSyncEnterprise` notification center.

---

## 🏛️ 1. Core Architectural Layout

The Notification Center is built on the **Strategy Pattern** to ensure delivery channel isolation and decoupling of business events from delivery details.

```
                  ┌──────────────────────┐
                  │    Business Event    │
                  └──────────┬───────────┘
                             │
                             ▼
               ┌──────────────────────────┐
               │   Notification Service   │
               └─────────────┬────────────┘
                             │
                             ▼
               ┌──────────────────────────┐
               │    Save Database (DB)    │
               └─────────────┬────────────┘
                             │
                             ▼
               ┌──────────────────────────┐
               │  Determine Channels      │
               │  (Preference Resolution) │
               └─────────────┬────────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │    EMAIL    │  │  IN_APP /   │  │   SYSTEM    │
     │  Strategy   │  │  WEBSOCKET  │  │  Strategy   │
     │             │  │  Strategy   │  │             │
     └─────────────┘  └─────────────┘  └─────────────┘
```

---

## ⚙️ 2. Core Components

1. **`NotificationEvent`**: Schema validating payload, types (e.g. `TASKS`, `VACATION`, `SYSTEM`), recipients, and priority.
2. **`NotificationDispatcher`**: Resolves preferences, interpolates text, saves initial DB record, and calls active channel strategies.
3. **`ChannelRegistry`**: Holds and serves instantiated adapters (`InAppChannel`, `EmailChannel`, `WebSocketChannel`, `PushChannel`, `SystemChannel`).

---

## 🔒 3. User Preferences & Filter Rules
* Each user preference maps an `employee_id` and `notification_type` to a specific delivery `channel` with an `enabled` boolean.
* When dispatching, if no preference exists, the dispatcher falls back to the default combination `[IN_APP, EMAIL]`.
* If preferences exist but are all disabled, it forces a fallback to `[IN_APP]` to ensure delivery is never entirely lost.

---

## 🛡️ 4. Reliability & Failover
* **Asynchronous Execution**: Deliveries are scheduled inside the `BackgroundJobService` pool to isolate thread transactions from main endpoint routing.
* **WebSocket Offline Cache**: WebSocket pushes are best-effort. If offline, the notification is cached in the DB as an `IN_APP` record, ensuring accessibility upon user re-connection.
* **Database-Backed Retry Poller**: Transient email failures are captured in `notification_logs`. A daemon poller scans `FAILED` emails and retries them up to a max threshold of 5 attempts.
