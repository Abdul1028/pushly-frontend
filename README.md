# 🏗️ Pushly — Full System Design

> **Pushly** is a static frontend deployment platform (like Vercel/Netlify).
> Users push code → GitHub Actions triggers a build → files land on S3 → served via Cloudflare Worker.

---

## 📐 High-Level Architecture

```mermaid
graph TB
    subgraph Developer["👨‍💻 Developer Side"]
        GH["GitHub Repository"]
        GHA["GitHub Actions CI/CD"]
        DEV_PAGE["Developers Page\npushly-developers-page\n(YAML Generator)"]
    end

    subgraph User["🖥️ User Dashboard"]
        FE["Frontend\nNext.js\nfrontend/"]
    end

    subgraph Core["⚙️ Core Platform — api.wareality.tech"]
        API["API Server\nSpring Boot\napi-server/"]
        DB[("PostgreSQL\nProjects\nDeployments\nUsers\nLogs")]
    end

    subgraph Build["🔨 Build Pipeline"]
        ECS["AWS ECS Fargate\nBuild Container"]
        DOCKER["Docker Image\nbuild-server/\nmain.sh + script.js"]
        S3[("AWS S3\n__outputs/\n{projectId}/\ndeployments/\n{deploymentId}/")]
    end

    subgraph Logging["📋 Log Pipeline"]
        REDIS["Upstash Redis\nStream: container-logs"]
        LOG_SVC["Log Service\nSpring Boot\nlog-service-kafka/"]
    end

    subgraph Serve["🌐 Serve Layer"]
        CF_WORKER["Cloudflare Worker\ncloud flare proxy/s3-proxy"]
        CF_KV["Cloudflare KV\nresolve:{subdomain}\n→ projectId + deploymentId"]
    end

    DEV_PAGE -->|"Generates GitHub Actions YAML"| GHA
    GH -->|"git push"| GHA
    GHA -->|"POST /api/projects/{id}/deployments"| API
    GHA -->|"POST /api/projects/{id}/deployments/{id}/deploy"| API
    FE -->|"REST API calls"| API
    API -->|"RunTask (Fargate)"| ECS
    ECS -->|"Runs"| DOCKER
    DOCKER -->|"git clone + build"| DOCKER
    DOCKER -->|"Upload static files"| S3
    DOCKER -->|"XADD logs"| REDIS
    DOCKER -->|"POST /internal/deployments/{id}/framework-detected"| API
    DOCKER -->|"POST /internal/deployments/{id}/complete"| API
    REDIS -->|"XREADGROUP"| LOG_SVC
    LOG_SVC -->|"Save logs"| DB
    API -->|"PUT KV resolve:{subdomain}"| CF_KV
    API -->|"Save deployment"| DB

    USER_BROWSER["👤 End User Browser"] -->|"https://subdomain.wareality.tech"| CF_WORKER
    CF_WORKER -->|"KV lookup: resolve:{subdomain}"| CF_KV
    CF_WORKER -->|"GET __outputs/{projectId}/deployments/{id}/index.html"| S3
```

---

## 🔄 Complete Flow: Push → Build → Deploy → Serve

### Phase 1: CI/CD Trigger (GitHub Actions)

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant GH as GitHub
    participant GHA as GitHub Actions
    participant API as API Server

    DEV->>GH: git push (any branch)
    GH->>GHA: Trigger workflow

    GHA->>GHA: Determine Environment
    Note over GHA: main branch → PRODUCTION<br/>other branches → STAGING

    GHA->>API: POST /api/projects/{PROJECT_ID}/deployments
    Note over GHA,API: Headers: Authorization: Bearer {PUSHLY_TOKEN}<br/>Body: { gitCommitHash, gitBranch, environment }

    API-->>GHA: { id: "deployment-id", status: "QUEUED" }

    GHA->>API: POST /api/projects/{PROJECT_ID}/deployments/{DEPLOYMENT_ID}/deploy?environment=PRODUCTION
    Note over GHA,API: Headers: Authorization: Bearer {PUSHLY_TOKEN}

    API-->>GHA: { status: "RUNNING", ecsTaskArn: "..." }
    GHA->>GHA: echo "🎉 Deployment triggered"
```

**GitHub Secrets Required:**
| Secret | Value |
|--------|-------|
| `PROJECT_ID` | Your Pushly project ID |
| `PUSHLY_TOKEN` | JWT token from Pushly dashboard |
| `SLACK_WEBHOOK_URL` | (Optional) Slack notifications |

---

### Phase 2: API Server → ECS Trigger

```mermaid
sequenceDiagram
    participant API as API Server
    participant ECS_SVC as ECSService.java
    participant AWS as AWS ECS Fargate
    participant CF_KV as Cloudflare KV

    API->>API: createDeployment()<br/>Save to DB (status: QUEUED)
    API->>API: processDeploymentAsync()

    API->>API: deployToEnvironment()<br/>status → DEPLOYING

    API->>ECS_SVC: runBuildTask(gitUrl, gitRef, env, projectId, deploymentId, githubToken)

    ECS_SVC->>AWS: RunTaskRequest<br/>LaunchType: FARGATE<br/>Container: builder-image<br/>Env vars injected

    AWS-->>ECS_SVC: taskArn

    ECS_SVC-->>API: taskArn
    API->>API: Save ecsTaskArn, status → RUNNING
    API->>API: generateDeploymentUrl()
    Note over API: PRODUCTION: https://{subdomain}.wareality.tech<br/>STAGING: https://{deploymentId}--{subdomain}.wareality.tech

    alt PRODUCTION deployment
        API->>CF_KV: PUT resolve:{subdomain}<br/>{ projectId, activeDeploymentId }
    end
```

**ECS Environment Variables Injected:**
```
GIT_URL          → project.gitURL
GIT_REF          → deployment.gitBranch
ENV              → PRODUCTION | STAGING
PROJECT_ID       → project.id
DEPLOYMENT_ID    → deployment.id
INTERNAL_TOKEN   → INTERNAL_PROXY_TOKEN secret
API_URL          → https://api.wareality.tech
GITHUB_TOKEN     → (if private repo, encrypted in DB)
```

---

### Phase 3: Build Container Execution

```mermaid
sequenceDiagram
    participant MAIN as main.sh
    participant REDIS as Upstash Redis
    participant SCRIPT as script.js
    participant API as API Server
    participant S3 as AWS S3

    MAIN->>REDIS: XADD "📦 Cloning repository..."
    MAIN->>MAIN: git clone {GIT_URL}
    MAIN->>MAIN: git checkout {GIT_REF}
    MAIN->>REDIS: XADD "✅ Repository cloned"
    MAIN->>SCRIPT: exec node script.js

    SCRIPT->>SCRIPT: detectFramework(outDirPath)
    Note over SCRIPT: Checks package.json, angular.json,<br/>app.json for 14 frameworks

    SCRIPT->>SCRIPT: validateFramework()
    Note over SCRIPT: Next.js: checks output:'export'<br/>in next.config.js/.mjs/.ts

    SCRIPT->>SCRIPT: resolveConfig()
    Note over SCRIPT: Priority: UI vars > gitway.config.json > auto-detect

    SCRIPT->>API: POST /internal/deployments/{id}/framework-detected
    Note over SCRIPT,API: { framework, buildCommand, installCommand, outputDirectory }

    SCRIPT->>REDIS: XADD "🔧 Installing dependencies..."
    SCRIPT->>SCRIPT: Run installCommand (npm ci / yarn / pnpm)

    SCRIPT->>REDIS: XADD "🏗️ Building..."
    SCRIPT->>SCRIPT: Run buildCommand (npm run build)

    alt Angular project
        SCRIPT->>SCRIPT: resolveAngularDeployDir()
        Note over SCRIPT: Detects Angular version<br/>≤15: dist/app/<br/>16+: dist/app/browser/
    end

    SCRIPT->>SCRIPT: walkAndUpload(distFolderPath)
    loop For each file in output dir
        SCRIPT->>S3: PutObject(__outputs/{projectId}/deployments/{deploymentId}/{file})
    end

    SCRIPT->>API: POST /internal/deployments/{id}/complete
    Note over SCRIPT,API: X-Internal-Token header required
```

---

### Phase 4: Log Pipeline

```mermaid
sequenceDiagram
    participant BUILD as Build Container
    participant REDIS as Upstash Redis Stream
    participant LOG as Log Service (Java)
    participant DB as PostgreSQL

    BUILD->>REDIS: XADD container-logs * { projectId, deploymentId, timestamp, log }

    loop Every 2 seconds (blocking)
        LOG->>REDIS: XREADGROUP GROUP log-group consumer-1 COUNT 10 BLOCK 2000
        REDIS-->>LOG: List of StreamEntry

        loop For each entry
            LOG->>DB: INSERT deployment_logs (projectId, deploymentId, timestamp, message)
            LOG->>REDIS: XACK container-logs log-group {entryId}
        end

        Note over LOG,REDIS: ⚠️ Missing: XTRIM to delete processed messages!
    end
```

**⚠️ Current Issue:** `XACK` marks as read but doesn't delete → 8,882 messages accumulating → hitting Upstash 500K command limit.

**Fix needed:**
```java
// Add after processing batch:
jedis.xtrim(streamKey, 1000, true);
```

---

### Phase 5: Serve Flow (End User)

```mermaid
sequenceDiagram
    participant USER as End User Browser
    participant CF as Cloudflare Worker
    participant KV as Cloudflare KV
    participant S3 as AWS S3 (Public)

    USER->>CF: GET https://myapp.wareality.tech/about

    CF->>CF: Parse hostname → subdomain = "myapp"

    CF->>KV: GET resolve:myapp
    alt KV HIT
        KV-->>CF: { projectId, activeDeploymentId }
    else KV MISS
        CF->>CF: GET /internal/cf/projects/resolve?subdomain=myapp
        Note over CF: Fallback to API Server
    end

    CF->>CF: path = "/about" (not static asset)
    CF->>S3: GET __outputs/{projectId}/deployments/{deploymentId}/about

    alt 404 + not static asset
        CF->>S3: GET __outputs/{projectId}/deployments/{deploymentId}/index.html
        Note over CF: SPA fallback for client-side routing
        CF-->>USER: index.html (200)
    else File found
        CF->>CF: Set Cache-Control headers
        Note over CF: Static assets: max-age=31536000 immutable<br/>HTML: no-cache
        CF-->>USER: File content
    end
```

**URL Formats:**
| Environment | URL Pattern |
|------------|-------------|
| Production | `https://{subdomain}.wareality.tech` |
| Staging | `https://{deploymentId}--{subdomain}.wareality.tech` |
| Custom Domain | `https://yourdomain.com` (via Cloudflare proxy) |

---

## 📡 Key API Endpoints

### Public API (JWT Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login → JWT token |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects` | List user's projects |
| `GET` | `/api/projects/{id}` | Get project details |
| `POST` | `/api/projects/{id}/deployments` | Create deployment (step 1) |
| `POST` | `/api/projects/{id}/deployments/{id}/deploy` | Trigger build (step 2) |
| `GET` | `/api/projects/{id}/deployments` | List deployments (paginated) |
| `GET` | `/api/projects/{id}/deployments/{id}` | Get deployment details |
| `POST` | `/api/projects/{id}/deployments/{id}/promote` | Promote staging → production |
| `POST` | `/api/projects/{id}/deployments/{id}/rollback` | Rollback to previous |
| `POST` | `/api/projects/{id}/deployments/{id}/stop` | Stop running ECS task |
| `DELETE` | `/api/projects/{id}/deployments/{id}` | Delete deployment |
| `GET` | `/api/projects/{id}/deployments/active` | Get active deployments per env |

### Internal API (X-Internal-Token Required)

| Method | Endpoint | Caller | Description |
|--------|----------|--------|-------------|
| `POST` | `/internal/deployments/{id}/framework-detected` | Build Server | Report detected framework + config |
| `POST` | `/internal/deployments/{id}/complete` | Build Server | Mark build SUCCESS |
| `POST` | `/internal/deployments/{id}/failed` | Build Server | Mark build FAILED |
| `GET` | `/internal/cf/projects/resolve?subdomain=X` | Cloudflare Worker | Resolve subdomain → project |

---

## 🗄️ Data Models

### Project
```
id                    UUID
name                  String
subdomain             String (unique, e.g. "myapp")
gitURL                String
userId                String (FK → User)
maxConcurrentDeployments  Int (default: 3)
customBuildCommand    String? (UI override)
customInstallCommand  String? (UI override)
customOutputDirectory String? (UI override)
activeProductionDeploymentId  String?
activeStagingDeploymentId     String?
```

### Deployment
```
id                  String (generated: {env}-{commitHash})
projectId           String (FK → Project)
status              QUEUED | DEPLOYING | RUNNING | SUCCESS | FAILED
environment         PRODUCTION | STAGING
gitCommitHash       String
gitBranch           String
version             Int (auto-incremented per project)
ecsTaskArn          String? (AWS task ARN)
deployedUrl         String?
errorMessage        String?
detectedFramework   String? (expo, nextjs, angular, vite, ...)
buildCommand        String? (resolved)
installCommand      String? (resolved)
outputDirectory     String? (resolved)
lastAction          DEPLOYED | PROMOTED | ROLLED_BACK
createdAt           LocalDateTime
deployedAt          LocalDateTime?
```

### DeploymentLog
```
id            Long (auto)
projectId     String
deploymentId  String
timestamp     Instant
message       String
```

---

## 🔧 Framework Detection

Supported frameworks (auto-detected in order):

| Framework | Detection Signal | Default Build Dir |
|-----------|-----------------|-------------------|
| Expo | `app.json` with `expo` key | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| Angular | `angular.json` exists | `dist/{appName}` (or `browser/`) |
| Next.js | `next` in dependencies | `out` (requires `output:'export'`) |
| Vite | `vite` in devDependencies | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| CRA | `react-scripts` in dependencies | `build` |
| Gatsby | `gatsby` in dependencies | [public](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/frontend/public) |
| Nuxt.js | `nuxt` in dependencies | `.output/public` |
| Vue CLI | `@vue/cli-service` in devDeps | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| SvelteKit | `@sveltejs/kit` in devDeps | `build` |
| Svelte | `svelte` in devDeps | [public](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/frontend/public) |
| Astro | `astro` in devDeps | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| Remix | `@remix-run/react` in deps | [public](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/frontend/public) |
| SolidJS | `solid-js` in deps | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| Qwik | `@builder.io/qwik` in deps | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |

**Config Override Hierarchy:**
```
UI Environment Variables (UI_BUILD_COMMAND, UI_INSTALL_COMMAND, UI_OUTPUT_DIR)
        ↓ (if not set)
gitway.config.json in repo root
        ↓ (if not set)
Auto-detected defaults
```

---

## 🏛️ Infrastructure

| Component | Service | Details |
|-----------|---------|---------|
| API Server | AWS EC2 / ECS | Spring Boot, port 8080 |
| Build Runner | AWS ECS Fargate | On-demand, 1 task per deployment |
| Database | AWS RDS PostgreSQL | Persistent storage |
| File Storage | AWS S3 | Static build outputs |
| Log Stream | Upstash Redis | Redis Streams (container-logs) |
| Log Consumer | Spring Boot | log-service-kafka/ |
| CDN + Proxy | Cloudflare Worker | Edge serving, KV routing |
| Domain Routing | Cloudflare KV | resolve:{subdomain} → projectId |
| Container Registry | AWS ECR | build-server Docker image |

---

## 🔐 Security

| Token | Used By | Header |
|-------|---------|--------|
| JWT (user) | Frontend → API | `Authorization: Bearer {token}` |
| PUSHLY_TOKEN | GitHub Actions → API | `Authorization: Bearer {token}` |
| INTERNAL_PROXY_TOKEN | Build Server → API | `X-Internal-Token` |
| INTERNAL_PROXY_TOKEN | Cloudflare Worker → API | `X-Internal-Token` |
| GITHUB_TOKEN | Build Server → GitHub | Injected into git clone URL |
| CLOUDFLARE_API_TOKEN | API → Cloudflare KV | `Authorization: Bearer` |

---

