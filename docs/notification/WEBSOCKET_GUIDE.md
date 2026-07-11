# WebSocket Notifications Gateway Guide

This document covers how to connect, authenticate, and communicate with the real-time notification push server.

---

## 📡 1. Connection Endpoint

The WebSocket server is mounted at the root level:
```
WS  /ws/notifications?token=<jwt_token>
WSS /ws/notifications?token=<jwt_token> (Production)
```

---

## 🔒 2. Authentication Protocol

WebSocket connections must pass a query string containing a valid JWT:
1. The token is parsed and verified against security keys.
2. It checks the token against blacklisted entries in the `token_blacklist` table.
3. It resolves the user ID and validates that the account is active.
4. If authentication fails, the connection accepts, logs, and immediately terminates with custom status code `4008` (Policy Violation).

---

## 💓 3. Heartbeat & Keep-Alive

To prevent intermediate proxies, firewalls, or browser inactivity timers from severing the connection, client connections must sustain a heartbeat exchange:
* **Client send**: `"ping"` or `"heartbeat"`
* **Server response**: `"pong"`
* **Interval recommendation**: Every 30 seconds.

---

## 💻 4. Client Javascript Example

Below is a template for frontend integrations:

```javascript
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const wsUrl = `ws://localhost:8000/ws/notifications?token=${token}`;

const socket = new WebSocket(wsUrl);

socket.onopen = (event) => {
    console.log("WebSocket connection established successfully.");
    
    // Start heartbeat interval
    setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send("ping");
        }
    }, 30000);
};

socket.onmessage = (event) => {
    if (event.data === "pong") {
        console.debug("Received heartbeat pong from server");
        return;
    }
    
    const notification = JSON.parse(event.data);
    console.log("New real-time notification received:", notification);
    // Display toast/in-app alert
};

socket.onclose = (event) => {
    console.warn(`WebSocket connection closed (Code: ${event.code})`);
    if (event.code === 4008) {
        console.error("Connection rejected: Unauthorized token.");
    } else {
        // Trigger backoff reconnect loop
    }
};
```
