# Pushly — Project Report
## A Self-Hosted Static Frontend Deployment Platform

---

## 1. Project Overview

**Pushly** is a cloud-native static frontend deployment platform built from scratch, inspired by services like Vercel and Netlify. It automates the complete lifecycle of a frontend application — from a developer pushing code to GitHub, through an automated build pipeline, to the app being live and served globally via Cloudflare's edge network.

The platform supports 14 major frontend frameworks, provides real-time build log streaming, and offers features like environment-based deployments (staging vs production), instant rollbacks, and framework auto-detection — all without relying on any third-party deployment service.

---

## 2. Motivation

Modern deployment platforms like Vercel and Netlify solve real problems but abstract away the infrastructure entirely. This project was built to:

- Deeply understand how a deployment pipeline works end-to-end
- Build production-grade distributed systems (event streaming, containerized workloads, edge serving)
- Create a self-owned, cost-controlled alternative that could be extended freely
- Gain hands-on experience with AWS (ECS Fargate, S3, RDS), Cloudflare Workers/KV, Redis Streams, and microservice architecture

---

## 3. High-Level Architecture

```
Developer
  └── git push
        ↓
   GitHub Actions (CI/CD)
        ↓
   API Server (Spring Boot, AWS ECS)
        ↓
   AWS ECS Fargate — Build Container (Docker)
        ├── git clone → build → upload → S3
        └── stream logs → Upstash Redis Streams
                               ↓
                         Log Service (Spring Boot)
                               ↓
                           PostgreSQL
                               ↓
                         Next.js Frontend (polls logs)

   End User Browser
        ↓
   Cloudflare Worker (edge)
        ├── KV lookup: resolve:{subdomain} → projectId + deploymentId
        └── S3 fetch: __outputs/{projectId}/deployments/{deploymentId}/{path}
```

---

## 4. System Components

### 4.1 Frontend ([frontend/](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/frontend))
- **Technology:** Next.js, TypeScript, Tailwind CSS
- **Role:** User dashboard for managing projects, viewing deployments, monitoring build logs
- **Key Pages:**
  - `/dashboard` — project list
  - `/project/{id}` — deployments, settings
  - `/logs?projectId=X&deploymentId=Y` — live build log viewer with real-time polling
- **Log rendering:** Polls the log service every 3 seconds. Each Redis stream entry may contain multiple newline-separated log lines (batched for efficiency) — the frontend splits on `\n` before rendering each line

### 4.2 API Server ([api-server/](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server))
- **Technology:** Spring Boot (Java), PostgreSQL (AWS RDS)
- **Role:** Core orchestration layer — user auth, project management, deployment lifecycle, ECS provisioning
- **Auth:** JWT-based for public endpoints, `X-Internal-Token` for internal endpoints called by the build container and Cloudflare Worker
- **Key responsibilities:**
  - Create and update [Project](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Project.java#16-245) and [Deployment](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Deployment.java#12-295) records
  - Trigger ECS Fargate tasks with injected build environment variables
  - Receive callbacks from the build container (`/framework-detected`, `/complete`, `/failed`)
  - Write routing entries to Cloudflare KV on deployment success
  - Support promote, rollback, and stop operations

### 4.3 Build Server ([build-server/](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server))
- **Technology:** Docker (Ubuntu), Bash, Node.js
- **Role:** The on-demand build worker — one ECS Fargate task per deployment
- **Two-stage execution:**
  1. [main.sh](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/main.sh) — git clone, pre-log handoff file
  2. [script.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/script.js) — framework detection, build execution, S3 upload, API callbacks
- **Pre-log handoff:** [main.sh](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/main.sh) cannot use Node's logger (it runs before Node starts), so it writes its logs to `/tmp/build-pre-logs.txt`. When [script.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/script.js) starts, it reads and publishes these lines through the Redis logger before proceeding

### 4.4 Log Service ([log-service-kafka/](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/log-service-kafka))
- **Technology:** Spring Boot (Java), Jedis (Redis client), PostgreSQL
- **Role:** Consumes the Redis stream `container-logs` and persists entries to the database
- **Consumer pattern:**
  - `XREADGROUP` with `count(100)` and `block(2000ms)` — reads up to 100 entries per poll
  - `saveAll(batch)` — single DB round-trip per batch instead of per-row inserts
  - `XACK` on every consumed entry
  - `XTRIM` every 50 batches to prevent indefinite stream growth
  - Pending entry recovery on startup — reclaims entries stuck from previous crashes

### 4.5 Cloudflare Worker (`cloud flare proxy/`)
- **Technology:** Cloudflare Workers (JavaScript), Cloudflare KV
- **Role:** Edge serving layer — resolves subdomains to S3 paths and proxies file content
- **Routing:**
  - `{subdomain}.wareality.tech` → production deployment
  - `{deploymentId}--{subdomain}.wareality.tech` → specific/staging deployment
- **KV lookup:** `resolve:{subdomain}` → `{ projectId, activeDeploymentId }`
- **SPA fallback:** If S3 returns 404 and the path has no file extension, serves `index.html` for client-side routing support
- **Cache headers:** Static assets (JS/CSS/images) → `max-age=31536000, immutable`; HTML → `no-cache`

---

## 5. CI/CD Pipeline

```
Developer: git push (any branch)
    ↓
GitHub Actions Workflow
    ├── branch = main → environment = PRODUCTION
    └── branch = other → environment = STAGING
    ↓
POST /api/projects/{PROJECT_ID}/deployments
    Body: { gitCommitHash, gitBranch, environment }
    Response: { deploymentId, status: QUEUED }
    ↓
POST /api/projects/{PROJECT_ID}/deployments/{id}/deploy?environment=PRODUCTION
    Response: { status: RUNNING, ecsTaskArn }
    ↓
API Server:
    → Decrypt GitHub token (private repos via AES encryption)
    → RunTask on AWS ECS Fargate
    → Inject: GIT_URL, GIT_REF, ENV, PROJECT_ID, DEPLOYMENT_ID, INTERNAL_TOKEN, API_URL, GITHUB_TOKEN
    → Save ecsTaskArn, update status to DEPLOYING
```

**GitHub Secrets required per project:** `PROJECT_ID`, `PUSHLY_TOKEN`, (optional) `SLACK_WEBHOOK_URL`

---

## 6. Build Pipeline (Inside the Container)

Each deployment runs in an isolated, ephemeral Docker container on AWS ECS Fargate.

### Stage 1 — [main.sh](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/main.sh)
```
1. Validate all required env vars (GIT_URL, GIT_REF, DEPLOYMENT_ID, PROJECT_ID, ENV)
2. Write "Cloning repository..." to /tmp/build-pre-logs.txt
3. git clone (injecting GITHUB_TOKEN into HTTPS URL for private repos)
4. git checkout GIT_REF (supports branches, tags, commit hashes)
5. Write "Repository cloned" to /tmp/build-pre-logs.txt
6. hand off: node script.js (keeps bash alive to catch Node exit code)
```

### Stage 2 — [script.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/script.js)
```
1. Read /tmp/build-pre-logs.txt → publish all lines to Redis → delete file
2. detectFramework(outDir, log)
   - Parse package.json dependencies + devDependencies
   - Check config files: angular.json, app.json, next.config.js, etc.
   - Return: { name, buildCmd, installCmd, buildDir }
3. validateFramework()
   - Next.js: verify output: 'export' in next.config.js/.mjs/.ts
4. resolveConfig() — applies override hierarchy
5. POST /internal/deployments/{id}/framework-detected
6. spawn(sh, [installCommand && buildCommand]) — real-time stdout via logger
7. Angular: resolveAngularDeployDir() — handles v15 (dist/app) vs v16+ (dist/app/browser)
8. walkAndUpload() — recursively PUT every file to S3:
   __outputs/{projectId}/deployments/{deploymentId}/{filepath}
9. POST /internal/deployments/{id}/complete
```

### Config Override Hierarchy
```
UI Environment Variables (UI_BUILD_COMMAND, UI_INSTALL_COMMAND, UI_OUTPUT_DIR)
    ↓ (if not set)
gitway.config.json in repo root
    ↓ (if not set)
Auto-detected defaults (based on framework + package manager)
```

### Package Manager Detection
Detected from lockfile presence: [pnpm-lock.yaml](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/pnpm-lock.yaml) → pnpm, `yarn.lock` → yarn, else → npm. Each package manager gets appropriate install/build command variants.

---

## 7. Framework Detection

| Framework | Detection Signal | Default Build Dir |
|-----------|----------------|-------------------|
| Expo | `expo` dep or `app.json` with `expo` key | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| Angular | `@angular/core` dep or `angular.json` | `dist/appName[/browser]` |
| Next.js | `next` dep | `out` |
| Vite | `vite` devDep | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| Create React App | `react-scripts` dep | `build` |
| Gatsby | `gatsby` dep | [public](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/frontend/public) |
| Nuxt.js | `nuxt` dep | `.output/public` |
| Vue CLI | `@vue/cli-service` devDep | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| SvelteKit | `@sveltejs/kit` devDep | `build` |
| Svelte | `svelte` devDep | [public](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/frontend/public) |
| Astro | `astro` devDep | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| Remix | `@remix-run/react` dep | [public](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/frontend/public) |
| SolidJS | `solid-js` dep | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| Qwik | `@builder.io/qwik` dep | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |

---

## 8. Log Streaming Pipeline

A key engineering challenge was streaming build logs from an ephemeral container to a browser in real time.

### Architecture
```
script.js / logger.js
    → logBuffer[] (500ms batch window)
    → redis.xadd("container-logs", { projectId, deploymentId, timestamp, message })
          message = multiple lines joined by \n (batch to reduce Redis commands)
    ↓
Upstash Redis Stream "container-logs"
    ↓
RedisLogConsumer.java (Spring Boot)
    → XREADGROUP GROUP log-group consumer-1 COUNT 100 BLOCK 2000
    → saveAll(batch)   ← one DB round-trip per read batch
    → XACK all entries
    → XTRIM every 50 batches
    ↓
PostgreSQL — deployment_logs table
    ↓
LogsPageClient.tsx (Next.js)
    → polls /logs/{projectId}/{deploymentId} every 3s
    → message.split('\n') → render each line individually
```

### Key Optimizations
- **`exec` → `spawn`:** Node's `exec()` buffers stdout. Replaced with `spawn()` so npm/build output streams line-by-line in real time
- **500ms batching:** Instead of one Redis XADD per log line, lines are buffered for 500ms and flushed as a single entry — reduces Redis commands by ~70% during `npm install`
- **Batch DB inserts:** `saveAll()` replaces per-row `save()` — reduces DB round-trips by up to 100x during high-volume builds
- **Handoff file:** [main.sh](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/main.sh) writes pre-Node logs to `/tmp/build-pre-logs.txt` with zero network overhead; Node reads and publishes them on startup

---

## 9. Serving Layer

### Cloudflare Worker Routing
```
Request: GET https://myapp.wareality.tech/dashboard

1. Parse hostname → subdomain = "myapp"
2. KV GET resolve:myapp → { projectId, activeDeploymentId }
   (fallback: GET /internal/cf/projects/resolve?subdomain=myapp)
3. S3 GET __outputs/{projectId}/deployments/{activeDeploymentId}/dashboard
4. If 404 and no file extension → S3 GET index.html (SPA fallback)
5. Set Cache-Control:
   - *.html → no-cache
   - *.js, *.css, images → max-age=31536000, immutable
```

### Instant Rollback / Promote
The `activeDeploymentId` stored in Cloudflare KV is the sole routing truth. Promoting or rolling back a deployment updates this single KV entry — no rebuild, no file movement. Traffic switches within milliseconds across all Cloudflare edge nodes.

---

## 10. Data Models

### Project
| Field | Type | Notes |
|-------|------|-------|
| [id](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/android) | UUID | Primary key |
| `name` | String | Display name |
| `subdomain` | String | Unique, used for routing |
| `gitURL` | String | Cloned by build container |
| `activeProductionDeploymentId` | String? | Points to live production build |
| `activeStagingDeploymentId` | String? | Points to live staging build |
| `customBuildCommand` | String? | UI override |
| `customInstallCommand` | String? | UI override |
| `customOutputDirectory` | String? | UI override |

### Deployment
| Field | Type | Notes |
|-------|------|-------|
| [id](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/android) | String | `{env}-{commitHash}` |
| `status` | Enum | `QUEUED → DEPLOYING → RUNNING → SUCCESS / FAILED` |
| `environment` | Enum | `PRODUCTION / STAGING` |
| `gitBranch` | String | |
| `gitCommitHash` | String | |
| `ecsTaskArn` | String? | For stop/monitoring |
| `deployedUrl` | String? | Live URL after success |
| `detectedFramework` | String? | Set by build container callback |
| `lastAction` | Enum | `DEPLOYED / PROMOTED / ROLLED_BACK` |

### DeploymentLog
| Field | Type |
|-------|------|
| [id](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/android) | Long (auto) |
| `projectId` | String |
| `deploymentId` | String |
| `timestamp` | Instant |
| `message` | String (may contain `\n`-separated batch) |

---

## 11. Security

| Token | Used By | Passed Via |
|-------|---------|-----------|
| JWT | Frontend → API Server | `Authorization: Bearer` |
| PUSHLY_TOKEN | GitHub Actions → API | `Authorization: Bearer` |
| INTERNAL_PROXY_TOKEN | Build Container → API | `X-Internal-Token` |
| INTERNAL_PROXY_TOKEN | Cloudflare Worker → API | `X-Internal-Token` |
| GITHUB_TOKEN (AES encrypted) | API → Build Container | ECS env var injection |
| CLOUDFLARE_API_TOKEN | API → Cloudflare KV | `Authorization: Bearer` |

GitHub tokens are stored AES-encrypted in the database and decrypted only at ECS task launch time.

---

## 12. Infrastructure

| Component | Service |
|-----------|---------|
| API Server | AWS ECS (always-on) |
| Build Workers | AWS ECS Fargate (on-demand per deployment) |
| Database | AWS RDS PostgreSQL |
| File Storage | AWS S3 |
| Log Stream | Upstash Redis (Redis Streams) |
| Log Consumer | Spring Boot (AWS ECS) |
| CDN + Edge Serving | Cloudflare Workers |
| Subdomain Routing | Cloudflare KV |
| Container Registry | AWS ECR |

---

## 13. Engineering Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Build logs appeared in bursts, not real-time | Replaced `exec()` with `spawn()` for line-by-line stdout streaming |
| One Redis command per log line hit free tier limits fast | 500ms client-side batch buffer in [logger.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/logger.js) — 70% fewer commands |
| [main.sh](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/main.sh) logs couldn't reach Redis without curl latency | Handoff file `/tmp/build-pre-logs.txt` — bash writes instantly, Node publishes on startup |
| Log consumer fell behind under high build volume | Increased `count(10 → 100)`, replaced `save()` with `saveAll()` |
| Pending stream entries lost after consumer crash | [reclaimPendingEntries()](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/log-service-kafka/src/main/java/com/pushly/LogService/LogService/Service/RedisLogConsumer.java#82-107) on startup sweeps and reclaims stuck entries |
| Angular build output differs between v15 and v16+ | [resolveAngularDeployDir()](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/framework-detector.js#288-349) inspects [dist/](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) for browser subdirectory |
| [notify_failure](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/main.sh#22-35) trap never fired on Node crash | Replaced `exec node` with `node script.js; check exit code` pattern |
| Each file upload logged a separate Redis XADD | Upload logs only printed to ECS stdout via `console.log` |

---

## 14. Key API Endpoints

### Public (JWT Auth)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/projects` | Create project |
| `POST` | `/api/projects/{id}/deployments` | Create deployment record |
| `POST` | `/api/projects/{id}/deployments/{id}/deploy` | Trigger ECS build |
| `POST` | `/api/projects/{id}/deployments/{id}/promote` | Promote staging → production |
| `POST` | `/api/projects/{id}/deployments/{id}/rollback` | Rollback to previous build |
| `POST` | `/api/projects/{id}/deployments/{id}/stop` | Stop running ECS task |

### Internal (X-Internal-Token)
| Method | Endpoint | Caller |
|--------|----------|--------|
| `POST` | `/internal/deployments/{id}/framework-detected` | Build container |
| `POST` | `/internal/deployments/{id}/complete` | Build container |
| `POST` | `/internal/deployments/{id}/failed` | Build container / main.sh |
| `GET` | `/internal/cf/projects/resolve?subdomain=X` | Cloudflare Worker (KV miss fallback) |
| `GET` | `/internal/github/token/{projectId}` | DeploymentService (internal) |
