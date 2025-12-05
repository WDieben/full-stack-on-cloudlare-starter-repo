# Architecture Blueprint: The Dual-Worker Pattern

This guide explains how to reproduce the **Secure Dual-Worker Architecture** used in this project. Use this pattern when you need a public-facing app that securely talks to a private backend worker.

---

## 🏗️ The Blueprint

### 1. The Setup
You need two Cloudflare Workers:
1.  **User Worker** (Public): Handles Frontend, Auth, and simple DB reads.
2.  **Data Worker** (Private): Handles Workflows, Queues, Durable Objects, and heavy logic.

### 2. The Connection
*   **User Worker** -> **Data Worker**: Connected via **Service Binding** (`BACKEND_SERVICE`).
*   **Frontend** -> **User Worker**: Connected via standard HTTP/WebSocket.
*   **Frontend** -> **Data Worker**: **IMPOSSIBLE** (No direct connection allowed).

```mermaid
graph LR
    subgraph "Public Zone"
        FE[Frontend]
        UserWorker[User Worker (Public)]
    end
    
    subgraph "Private Zone"
        DataWorker[Data Worker (Private)]
        Resources[Queues / Workflows / DOs]
    end
    
    FE -->|"HTTP / WebSocket"| UserWorker
    UserWorker -->|"Service Binding"| DataWorker
    DataWorker --> Resources
```

---

## 🚀 How to Reproduce This

### Step 1: Configure `wrangler.jsonc`

**User Worker (Public)**
Add a service binding to point to your data worker.
```jsonc
"services": [
  {
    "binding": "BACKEND_SERVICE",
    "service": "my-data-worker-name" 
  }
]
```

**Data Worker (Private)**
Do **not** add a route or custom domain for the API. It should only be accessible via the binding.
*(Optional: You can add a specific route for public features like link redirection, but keep the API internal)*

### Step 2: The "Proxy" Pattern (User Worker)

In your User Worker (Hono), create a route that proxies requests to the Data Worker. This is where you enforce **Authentication**.

```typescript
// apps/user-application/worker/hono/app.ts
App.all("/api/internal/*", authMiddleware, async (c) => {
    // 1. Verify Auth (The Data Worker trusts us)
    const userId = c.get("userId");
    
    // 2. Create a new request to the Data Worker
    // Note: The URL domain doesn't matter for Service Bindings
    const newRequest = new Request(c.req.raw, {
        headers: {
            ...c.req.header(),
            "X-User-Id": userId // Pass auth info internally
        }
    });

    // 3. Call the Data Worker via Binding
    return c.env.BACKEND_SERVICE.fetch(newRequest);
});
```

### Step 3: The "Internal" API (Data Worker)

In your Data Worker, write standard Hono routes. They don't need auth middleware because they trust the User Worker.

```typescript
// apps/data-service/src/hono/app.ts
App.post("/api/internal/trigger-workflow", async (c) => {
    // 1. Get the trusted user ID from the header
    const userId = c.req.header("X-User-Id");
    
    // 2. Run your heavy logic (Queues, Workflows, DOs)
    await c.env.MY_WORKFLOW.create({ params: { userId } });
    
    return c.json({ success: true });
});
```

---

## 💡 Common Patterns

### Pattern A: The "Fire and Forget" (Queues)
**Use for:** Analytics, Logs, Background Jobs.
1.  Frontend calls User Worker.
2.  User Worker sends message to Queue (via Binding or direct Queue binding).
3.  Data Worker processes Queue in background.

### Pattern B: The "Real-Time" Tunnel (WebSockets)
**Use for:** Chat, Live Cursors, Notifications.
1.  Frontend connects WebSocket to User Worker.
2.  User Worker proxies the `Upgrade` request to Data Worker.
3.  Data Worker handles the WebSocket inside a Durable Object.

### Pattern C: The "Heavy Lifter" (Workflows)
**Use for:** PDF Generation, AI Processing, Long tasks.
1.  Frontend calls User Worker (HTTP POST).
2.  User Worker calls Data Worker (Service Binding).
3.  Data Worker starts a Workflow.

---

## 🛡️ Security Checklist

When implementing this in a new project:
- [ ] **Data Worker**: Ensure no `routes` are defined in `wrangler.jsonc` (unless intended for public access like link redirects).
- [ ] **User Worker**: Ensure `authMiddleware` is applied to all proxy routes.
- [ ] **Service Binding**: Use `BACKEND_SERVICE` (or similar name) to link them.
- [ ] **Trust**: The Data Worker should blindly trust headers from the User Worker (since only the User Worker can call it).
