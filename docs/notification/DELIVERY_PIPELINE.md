# Notification Delivery Pipeline

This document charts the end-to-end sequence of notification event dispatching and deliveries in `TaskSyncEnterprise`.

---

## 🏃 1. End-to-End Pipeline Workflow

```
[Business Event] (e.g. Vacation Approved, Task Assigned)
       │
       ▼
1. Event Creation & Validation
   - NotificationService.create_event()
   - Generates unique UUID event_id, validates payload and priority.
       │
       ▼
2. Asynchronous Queueing
   - NotificationService.trigger_event_async()
   - Schedules async_dispatch_notification_task in BackgroundJobService.
       │
       ▼
3. Format Subject and Body
   - NotificationFormatter.format() maps type (TASKS/VACATION) to templates.
       │
       ▼
4. Preferences Resolution
   - NotificationDispatcher._resolve_channels() queries user channel choices.
   - Defaults: [IN_APP, EMAIL]
       │
       ▼
5. Persist Initial Database Record
   - Inserts row in `notifications` with status "PROCESSING".
   - Maps SYSTEM channel to IN_APP string to respect check constraints.
       │
       ▼
6. Strategy Invocation
   - Resolves channel adapter strategy from ChannelRegistry.
   - Invokes channel.send()
       │
       ▼
7. Delivery Result & Logging
   - Updates status in database to "SENT" or "FAILED".
   - Appends detailed log entry to `notification_logs` table.
```

---

## 🛠️ 2. Extensibility

Adding a new notification channel (e.g. SMS) is fully decoupled:
1. **Add to Enum**: Appended to `NotificationChannel` in `enums.py`.
2. **Implement Strategy**: Create `SmsChannel` implementing `NotificationChannel` ABC.
3. **Register Strategy**: Call `channel_registry.register(SmsChannel())` in `registry.py`.
4. The dispatcher and services will automatically route alerts through the new strategy without changing core logic.
