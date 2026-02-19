# Logs System Migration Plan
### Spring Boot → Edge + Redis + Next.js (Cost Optimized)

This document describes the migration of the **deployment logs system** from an always-on Spring Boot service to a **serverless, edge-first, low-cost architecture**, while preserving:

- ✅ Real-time logs
- ✅ Logs persistence in DB
- ✅ Existing Redis stream producer
- ✅ Current UI/UX expectations

---

## 1. Current Architecture (Before)

### Components
1. **Build Container**
   - Pushes logs to Redis Stream (`container-logs`)

2. **Upstash Redis**
   - Acts as a message buffer

3. **Spring Boot Log Service (Always ON ❌)**
   - Redis consumer group
   - Reads logs continuously
   - Persists logs into DB
   - Exposes REST API to fetch logs

4. **Next.js Frontend**
   - Polls log service every 2–3 seconds

### Problems
- ❌ Always-running Spring Boot app (high dyno cost)
- ❌ Constant polling from frontend
- ❌ Tight coupling: realtime viewing = persistence
- ❌ Overkill infra for logs

---

## 2. Target Architecture (After)

### Key Principles
- **Event-driven**
- **Serverless**
- **Pay-per-use**
- **Decoupled realtime vs persistence**

---

## 3. New Architecture Overview

```
Build Container
     │
     ▼
Redis Stream (container-logs)
     │
     ├──► Edge SSE (Next.js API) ──► Browser (Realtime logs)
     │
     └──► DB Flush Job (on-demand / cron / event)
```

---

## 4. Migration Steps

### Step 1 — Build Container (Unchanged)
Logs continue to be pushed to Redis Streams.

### Step 2 — Realtime Logs via SSE
Use Next.js Edge API routes to stream logs directly from Redis.

### Step 3 — Frontend Consumption
Replace polling with `EventSource` for instant logs.

### Step 4 — Persistence
Persist logs to DB only when required (deployment finished / cron).

---

How it works (step-by-step)
1️⃣ Build container (unchanged)

You already have this:

redis.xadd("container-logs", "*", {
  projectId,
  deploymentId,
  timestamp: new Date().toISOString(),
  message
});


Perfect. Don’t touch it.

2️⃣ WebSocket endpoint (Next.js / Edge)

📁 app/api/logs/stream/route.ts

import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const deploymentId = searchParams.get("deploymentId");

  if (!projectId || !deploymentId) {
    return new Response("Missing params", { status: 400 });
  }

  let lastId = "0-0";

  const stream = new ReadableStream({
    async pull(controller) {
      const entries = await redis.xread(
        { key: "container-logs", id: lastId },
        { block: 2000, count: 10 }
      );

      if (!entries) return;

      for (const [, records] of entries) {
        for (const [id, fields] of records) {
          if (
            fields.projectId === projectId &&
            fields.deploymentId === deploymentId
          ) {
            controller.enqueue(
              `data: ${JSON.stringify(fields)}\n\n`
            );
          }
          lastId = id;
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}


This is Server-Sent Events (SSE) — lighter than WebSockets, perfect for logs.

3️⃣ Frontend: real-time stream (NO polling)

Replace your setInterval(fetchLogs) with:

useEffect(() => {
  if (!projectId || !deploymentId) return;

  const es = new EventSource(
    `/api/logs/stream?projectId=${projectId}&deploymentId=${deploymentId}`
  );

  es.onmessage = (e) => {
    const log = JSON.parse(e.data);
    setLogs(prev => [...prev, log.message].slice(-1000));
  };

  es.onerror = () => {
    es.close();
  };

  return () => es.close();
}, [projectId, deploymentId]);


🔥 Instant logs
🔥 Zero polling
🔥 Very low cost

4️⃣ DB persistence (decoupled)

You still want logs in DB — agreed.

Do NOT persist in real-time.

Instead:

When deployment finishes → flush Redis → DB

Or cron every 30–60s

Or on page exit

This is exactly what big platforms do.

---

## 5. What We Remove

- Spring Boot log service
- Redis consumer group
- Constant dyno usage
- Polling loops

---

## 6. Benefits

- Massive cost reduction
- Cleaner architecture
- Real-time UX
- Serverless infra

---

## 7. Status

🟡 Planned  
🟢 Ready to implement
