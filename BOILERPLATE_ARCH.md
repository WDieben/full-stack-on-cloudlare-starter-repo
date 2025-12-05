# Boilerplate Architecture & Replication Guide

**Role:** Principal Software Architect & Technical Writer
**Date:** November 20, 2025
**Version:** 1.1.0

---

## 1. High-Level Architecture

This monorepo implements a high-performance, edge-native full-stack application using Cloudflare Workers, D1, Durable Objects, Queues, and Workflows. It separates concerns into a shared data operation library, a high-throughput backend service, and a user-facing frontend application.

### Visual Tree

```text
.
├── apps
│   ├── data-service       # Backend Worker (High Throughput, Queues, DOs, Workflows)
│   │   ├── src
│   │   │   ├── durable-objects # Real-time state (e.g., LinkClickTracker)
│   │   │   ├── hono            # API Routing
│   │   │   ├── queue-handlers  # Async processing
│   │   │   └── workflows       # Long-running tasks (Browser/AI)
│   │   └── wrangler.jsonc      # Infrastructure Config (Env: Stage/Prod)
│   │
│   └── user-application   # Frontend (Vite + React) + BFF Worker
│       ├── worker         # Backend-for-Frontend (tRPC, Auth, Proxy)
│       ├── src            # React App
│       └── wrangler.jsonc # Frontend Config
│
└── packages
    └── data-ops           # Shared "Brain" (Schemas, DB, Auth)
        ├── src
        │   ├── db         # Drizzle ORM Setup
        │   ├── zod        # Shared Zod Schemas (The "Bridge")
        │   └── auth.ts    # Better-Auth Factory
        └── package.json
```

### The "Why": Splitting `@packages/data-ops` from `@apps/data-service`

We separate **Data Operations** (`data-ops`) from the **Data Service** (`data-service`) to create a **Single Source of Truth**.

1.  **Type Safety:** `data-ops` exports Zod schemas and TypeScript types. Both the Frontend (`user-application`) and Backend (`data-service`) import from here. If the database schema changes, both apps break at build time, preventing runtime errors.
2.  **Code Reuse:** Database queries (Drizzle) and Auth logic (`better-auth`) are defined once in `data-ops` and reused. The Frontend's BFF worker uses them for UI data, while the Backend worker uses them for async processing and high-throughput endpoints.
3.  **Scalability:** The `data-service` is dedicated to heavy lifting (Queues, Workflows, DOs). The `user-application` is lightweight and focused on UI rendering and simple data fetching.

---

## 2. Deep Dive: The "Secret Sauce"

This section analyzes the critical patterns that make this architecture robust and scalable.

### A. The "Zod Bridge"

The **Zod Bridge** ensures that the data shape is consistent across the entire stack. We define schemas in `packages/data-ops/src/zod` and use them everywhere.

*   **Defined in:** `packages/data-ops/src/zod/links.ts`
*   **Used in Backend:** Validates incoming requests in `apps/data-service`.
*   **Used in Frontend:** Validates form inputs in `apps/user-application`.
*   **Used in Queues:** `QueueMessageSchema` in `packages/data-ops/src/zod/queue.ts` ensures that messages sent to the queue match exactly what the consumer expects.

### B. Authentication Architecture (Better Auth)

We use **Better Auth** with a custom factory pattern to share authentication logic between the shared package and the actual workers.

**1. The Factory (`packages/data-ops/auth.ts`)**
We export a `getAuth` function that acts as a singleton factory. It takes environment secrets (like Google Client ID) which are only available at runtime in the Worker, and initializes the library with the Drizzle adapter.

```typescript
// packages/data-ops/auth.ts
export function getAuth(google: { clientId: string; clientSecret: string }) {
    if (auth) return auth; // Singleton
    auth = createBetterAuth(drizzleAdapter(getDb(), ...), google);
    return auth;
}
```

**2. The Middleware (`apps/user-application/worker/hono/app.ts`)**
The Frontend Worker (BFF) implements an `authMiddleware` that protects routes.
*   It calls `getAuth(c.env)` to initialize the auth engine with the current worker's environment variables.
*   It checks the session using `auth.api.getSession`.
*   It sets `userId` in the context for downstream handlers (like tRPC).

```typescript
const authMiddleware = createMiddleware(async (c, next) => {
    const auth = getAuthInstance(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.text("Unauthorized", 401);
    c.set("userId", session.user.id);
    await next();
});
```

### C. Worker-to-Worker Communication

We use **Service Bindings** and **WorkerEntrypoint** to allow the Frontend Worker to talk directly to the Backend Worker without going over the public internet.

**The Setup:**
1.  **Backend (`data-service`):** Extends `WorkerEntrypoint` in `src/index.ts`. This exposes methods like `fetch` and `queue`.
2.  **Frontend (`user-application`):** Binds to the backend via `wrangler.jsonc`:
    ```jsonc
    "services": [{ "binding": "BACKEND_SERVICE", "service": "data-service-production" }]
    ```
3.  **The Call:** The Frontend proxies WebSocket requests to the Backend.

### D. Durable Objects & Queues: The Async Flow

This architecture handles high-traffic link clicks without blocking the user.

**The Workflow:**
1.  **Request:** User clicks a link (`GET /:id` in `data-service`).
2.  **Fast Path:** The handler parses headers, determines destination, sends a message to the **Queue**, and redirects. *Response: <10ms.*
3.  **Async Path:** The `data-service` consumes its own queue. `handleLinkClick` writes to DB and triggers a **Workflow** (`DestinationEvaluationWorkflow`) to check link health using AI/Browser Rendering.
4.  **Real-Time Path:** `LinkClickTracker` (Durable Object) maintains a real-time counter and broadcasts updates via WebSockets.

---

## 3. Operational Strategy

This section covers how to deploy, manage, and test the system across environments.

### A. Multi-Environment Deployment (Stage vs. Production)

We use Cloudflare's `env` feature to strictly separate Staging and Production resources (Databases, Queues, KV).

**1. Configuration (`wrangler.jsonc`)**
Each `wrangler.jsonc` defines specific bindings for `stage` and `production`.
*   **Stage:** Uses remote D1 (`experimental_remote: true`) but connects to a specific "Stage" database ID.
*   **Production:** Connects to the "Production" database ID.

**2. Deployment Scripts (`package.json`)**

*   **Frontend (`apps/user-application`):**
    *   `stage:deploy`: Builds the React app (`vite build`) and deploys the worker.
    *   `production:deploy`: Builds with `mode production` (optimizing assets) and deploys.
    *   *Note:* The root `package.json` script `build-package` ensures `@repo/data-ops` is built before the frontend attempts to bundle it.

*   **Backend (`apps/data-service`):**
    *   `stage:deploy`: `wrangler deploy --env stage`
    *   `production:deploy`: `wrangler deploy --env production`

### B. Testing Strategy

*   **Unit Tests:** Run via `vitest`.
*   **Integration Tests:** The `dev` scripts (`wrangler dev --x-remote-bindings`) allow developers to run the worker locally while connecting to real (Stage) Cloudflare resources (D1, KV, Queues). This "Hybrid" development model eliminates "it works on my machine" issues with emulators.

---

## 4. The Replication Recipe (Step-by-Step)

Follow these steps to rebuild this architecture from scratch.

### Step 1: Scaffold the Monorepo
Use `npm` to create a standard Cloudflare monorepo structure.
```bash
mkdir my-stack && cd my-stack
npm init -y
npm install turbo --save-dev
```

### Step 2: Workspace Setup
Configure `package.json` workspaces:
```json
{ "workspaces": [ "apps/*", "packages/*" ] }
```
Create directories: `apps/data-service`, `apps/user-application`, `packages/data-ops`.

### Step 3: The "Golden Files"

#### A. Shared Package (`packages/data-ops/package.json`)
```json
{
  "name": "@repo/data-ops",
  "exports": {
    "./zod-schema/*": "./src/zod/*.ts",
    "./auth": "./auth.ts",
    "./database": "./src/db/database.ts"
  }
}
```

#### B. Auth Factory (`packages/data-ops/auth.ts`)
Implement the `getAuth` singleton pattern using `better-auth` and `drizzle-adapter`.

#### C. Infrastructure Init
Run these commands to generate resources for **both** environments:
```bash
# Stage
npx wrangler d1 create my-db-stage
npx wrangler queues create my-queue-stage

# Production
npx wrangler d1 create my-db-prod
npx wrangler queues create my-queue-prod
```
Update `wrangler.jsonc` with the respective IDs under `env.stage` and `env.production`.

### Step 4: Deploy
```bash
# Deploy Backend to Stage
cd apps/data-service
npm run stage:deploy

# Deploy Frontend to Stage
cd ../user-application
npm run stage:deploy
```
