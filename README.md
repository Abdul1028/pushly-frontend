# Pushly — Full System Design

> **Pushly** is a static frontend deployment platform (like Vercel/Netlify).
> Users push code → GitHub Actions triggers a build → files land on S3 → served via Cloudflare Worker.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Developer["Developer Side"]
        GH["GitHub Repository"]
        GHA["GitHub Actions CI/CD"]
        DEV_PAGE["Developers Page\npushly-developers-page\nYAML Generator"]
    end

    subgraph UserDash["User Dashboard"]
        FE["Frontend\nNext.js\nfrontend/"]
    end

    subgraph Core["Core Platform\napi.wareality.tech"]
        API["API Server\nSpring Boot\napi-server/"]
        DB[("PostgreSQL\nProjects / Deployments\nUsers / Logs")]
    end

    subgraph BuildPipeline["Build Pipeline"]
        ECS["AWS ECS Fargate\nBuild Container"]
        DOCKER["Docker Image\nbuild-server\nmain.sh + script.js"]
        S3[("AWS S3\n__outputs/projectId/\ndeployments/deploymentId/")]
    end

    subgraph LogPipeline["Log Pipeline"]
        REDIS["Upstash Redis\nStream: container-logs"]
        LOG_SVC["Log Service\nSpring Boot\nlog-service-kafka/"]
    end

    subgraph ServeLayer["Serve Layer"]
        CF_WORKER["Cloudflare Worker\ns3-proxy"]
        CF_KV["Cloudflare KV\nresolve:subdomain\nprojectId + deploymentId"]
    end

    USER_BROWSER["End User Browser"]

    DEV_PAGE -->|"Generates GitHub Actions YAML"| GHA
    GH -->|"git push"| GHA
    GHA -->|"POST /api/projects/id/deployments"| API
    GHA -->|"POST /api/projects/id/deployments/id/deploy"| API
    FE -->|"REST API calls"| API
    API -->|"RunTask Fargate"| ECS
    ECS -->|"Runs"| DOCKER
    DOCKER -->|"git clone + build"| DOCKER
    DOCKER -->|"Upload static files"| S3
    DOCKER -->|"XADD logs"| REDIS
    DOCKER -->|"POST framework-detected"| API
    DOCKER -->|"POST complete"| API
    REDIS -->|"XREADGROUP"| LOG_SVC
    LOG_SVC -->|"Save logs"| DB
    API -->|"PUT KV resolve:subdomain"| CF_KV
    API -->|"Save deployment"| DB
    USER_BROWSER -->|"https://subdomain.wareality.tech"| CF_WORKER
    CF_WORKER -->|"KV lookup resolve:subdomain"| CF_KV
    CF_WORKER -->|"GET index.html"| S3
```

---

## Complete Flow: Push to Build to Deploy to Serve

### Phase 1: CI/CD Trigger (GitHub Actions)

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant GH as GitHub
    participant GHA as GitHub Actions
    participant API as API Server

    DEV->>GH: git push any branch
    GH->>GHA: Trigger workflow

    GHA->>GHA: Determine Environment
    Note over GHA: main branch = PRODUCTION, other branches = STAGING

    GHA->>API: POST /api/projects/PROJECT_ID/deployments
    Note over GHA,API: Auth: Bearer PUSHLY_TOKEN, Body: gitCommitHash + gitBranch + environment

    API-->>GHA: id + status QUEUED

    GHA->>API: POST /api/projects/PROJECT_ID/deployments/DEPLOYMENT_ID/deploy?environment=PRODUCTION
    Note over GHA,API: Auth: Bearer PUSHLY_TOKEN

    API-->>GHA: status RUNNING + ecsTaskArn
    GHA->>GHA: Deployment triggered successfully
```

**GitHub Secrets Required:**

| Secret | Value |
|--------|-------|
| `PROJECT_ID` | Your Pushly project ID |
| `PUSHLY_TOKEN` | JWT token from Pushly dashboard |
| `SLACK_WEBHOOK_URL` | (Optional) Slack notifications |

---

### Phase 2: API Server to ECS Trigger

```mermaid
sequenceDiagram
    participant API as API Server
    participant GH_CTRL as InternalGitHubController
    participant ECS_SVC as ECSService.java
    participant AWS as AWS ECS Fargate
    participant CF_KV as Cloudflare KV

    API->>API: createDeployment, save to DB, status QUEUED
    API->>API: processDeploymentAsync
    API->>API: deployToEnvironmentInternal, status DEPLOYING

    API->>GH_CTRL: GET /internal/github/token/projectId
    Note over API,GH_CTRL: Decrypts owner GitHub token for private repo access
    GH_CTRL-->>API: decrypted githubToken (or null if public)

    API->>ECS_SVC: runBuildTask(gitUrl, gitRef, env, projectId, deploymentId, githubToken)
    ECS_SVC->>AWS: RunTaskRequest, LaunchType FARGATE, Container builder-image, env vars injected
    AWS-->>ECS_SVC: taskArn
    ECS_SVC-->>API: taskArn

    API->>API: Save ecsTaskArn, status RUNNING
    API->>API: updateActiveDeployment(project, deployment, environment)
    Note over API: Sets project.activeProductionDeploymentId or activeStagingDeploymentId

    alt PRODUCTION deployment
        API->>CF_KV: PUT resolve:subdomain
        Note over API,CF_KV: payload = projectId + activeDeploymentId + updatedAt
    end
```

**ECS Environment Variables Injected:**

```
GIT_URL          = project.gitURL
GIT_REF          = deployment.gitBranch
ENV              = PRODUCTION or STAGING
PROJECT_ID       = project.id
DEPLOYMENT_ID    = deployment.id
INTERNAL_TOKEN   = INTERNAL_PROXY_TOKEN secret
API_URL          = https://api.wareality.tech
GITHUB_TOKEN     = encrypted token (private repos only)
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

    MAIN->>REDIS: XADD "Cloning repository..."
    MAIN->>MAIN: git clone GIT_URL
    MAIN->>MAIN: git checkout GIT_REF
    MAIN->>REDIS: XADD "Repository cloned successfully"
    MAIN->>SCRIPT: exec node script.js

    SCRIPT->>SCRIPT: detectFramework(outDirPath)
    Note over SCRIPT: Checks package.json, angular.json, app.json for 14 frameworks

    SCRIPT->>SCRIPT: validateFramework()
    Note over SCRIPT: Next.js checks output export in next.config.js/.mjs/.ts

    SCRIPT->>SCRIPT: resolveConfig()
    Note over SCRIPT: Priority: UI env vars > gitway.config.json > auto-detect

    SCRIPT->>API: POST /internal/deployments/id/framework-detected
    Note over SCRIPT,API: Body: framework + buildCommand + installCommand + outputDirectory

    SCRIPT->>REDIS: XADD "Installing dependencies..."
    SCRIPT->>SCRIPT: Run installCommand

    SCRIPT->>REDIS: XADD "Building..."
    SCRIPT->>SCRIPT: Run buildCommand

    alt Angular project
        SCRIPT->>SCRIPT: resolveAngularDeployDir()
        Note over SCRIPT: v15 and below = dist/app/, v16+ = dist/app/browser/
    end

    SCRIPT->>SCRIPT: walkAndUpload(distFolderPath)
    loop For each file in output dir
        SCRIPT->>S3: PutObject __outputs/projectId/deployments/deploymentId/file
    end

    SCRIPT->>API: POST /internal/deployments/id/complete
    Note over SCRIPT,API: X-Internal-Token header required
```

---

### Phase 4: Log Pipeline

```mermaid
sequenceDiagram
    participant BUILD as Build Container
    participant REDIS as Upstash Redis Stream
    participant LOG as Log Service Java
    participant DB as PostgreSQL

    BUILD->>REDIS: XADD container-logs with projectId + deploymentId + timestamp + log

    loop Every 2 seconds blocking poll
        LOG->>REDIS: XREADGROUP GROUP log-group consumer-1 COUNT 10 BLOCK 2000
        REDIS-->>LOG: List of StreamEntry

        loop For each entry
            LOG->>DB: INSERT deployment_logs
            LOG->>REDIS: XACK container-logs log-group entryId
        end

        Note over LOG,REDIS: MISSING: XTRIM to delete processed messages causes accumulation
    end
```

> **Issue:** `XACK` marks as read but does NOT delete. Add `jedis.xtrim(streamKey, 1000, true)` after each batch.

---

### Phase 5: Serve Flow (End User)

```mermaid
sequenceDiagram
    participant USER as End User Browser
    participant CF as Cloudflare Worker
    participant KV as Cloudflare KV
    participant S3 as AWS S3 Public

    USER->>CF: GET https://myapp.wareality.tech/about

    CF->>CF: Parse hostname, subdomain = myapp

    CF->>KV: GET resolve:myapp
    alt KV HIT
        KV-->>CF: projectId + activeDeploymentId
    else KV MISS
        CF->>CF: Fallback GET /internal/cf/projects/resolve?subdomain=myapp
    end

    CF->>S3: GET __outputs/projectId/deployments/deploymentId/about

    alt 404 and not a static asset
        CF->>S3: GET index.html
        Note over CF: SPA fallback for client-side routing
        CF-->>USER: index.html 200
    else File found
        CF->>CF: Set Cache-Control
        Note over CF: Static assets = max-age 31536000 immutable, HTML = no-cache
        CF-->>USER: File content
    end
```

**URL Formats:**

| Environment | URL Pattern |
|------------|-------------|
| Production | `https://{subdomain}.wareality.tech` |
| Staging | `https://{deploymentId}--{subdomain}.wareality.tech` |

---



### Phase 6: Custom Domain & SSL Provisioning

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant API as API Server
    participant CF_API as Cloudflare API
    participant LE as SSL Provider (Let's Encrypt)
    participant CF_KV as Cloudflare KV

    DEV->>API: POST /api/projects/{id}/custom-domain (domain="app.myorg.com")
    API->>CF_API: Create Custom Hostname (Cloudflare for SaaS fallback)
    CF_API-->>API: Required DNS Verification Records (TXT/CNAME)
    API-->>DEV: Return DNS verification instructions
    
    DEV->>DEV: Configures DNS provider (Route53, Namecheap, etc.)
    
    loop Real-time verification
        CF_API->>CF_API: Check DNS propagation
    end
    
    CF_API->>LE: Request Wildcard SSL/TLS Certificate
    LE-->>CF_API: Certificate Issued
    
    API->>CF_KV: PUT resolve:app.myorg.com → { projectId, activeDeploymentId }
    Note over API,CF_KV: Link domain to internal project routing
```

**Key Steps:**
1. **Request:** User requests mapping for a custom apex or sub-domain.
2. **Cloudflare SaaS Integration:** The API Server connects to Cloudflare to register a Custom Hostname targeting the Gitway Cloudflare Worker fallback.
3. **DNS Challenge:** The user provisions the necessary verification CNAME/TXT records at their registrar.
4. **Automated SSL:** Cloudflare dynamically validates the DNS, automatically issues an SSL/TLS certificate, and begins routing encrypted traffic identically to the `.wareality.tech` flow, mapped via the KV store.

---

## Key API Endpoints

### Public API — JWT Auth Required

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns JWT token |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects` | List user projects |
| `GET` | `/api/projects/{id}` | Get project details |
| `POST` | `/api/projects/{id}/deployments` | Create deployment (step 1) |
| `POST` | `/api/projects/{id}/deployments/{id}/deploy` | Trigger build (step 2) |
| `GET` | `/api/projects/{id}/deployments` | List deployments paginated |
| `GET` | `/api/projects/{id}/deployments/{id}` | Get deployment details |
| `POST` | `/api/projects/{id}/deployments/{id}/promote` | Promote staging to production |
| `POST` | `/api/projects/{id}/deployments/{id}/rollback` | Rollback to previous |
| `POST` | `/api/projects/{id}/deployments/{id}/stop` | Stop running ECS task |
| `DELETE` | `/api/projects/{id}/deployments/{id}` | Delete deployment |
| `GET` | `/api/projects/{id}/deployments/active` | Get active deployments per env |

### Internal API — X-Internal-Token Required

#### InternalDeploymentController — called by Build Server (ECS)

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| `POST` | `/internal/deployments/{id}/complete` | none | `{ success, deploymentId, status }` |
| `POST` | `/internal/deployments/{id}/failed` | `{ error: "message" }` | `{ success, deploymentId, status }` |
| `POST` | `/internal/deployments/{id}/framework-detected` | `{ framework, buildCommand, installCommand, outputDirectory }` | `{ success, deploymentId, framework }` |

#### InternalCloudFlareController — called by Cloudflare Worker (KV miss fallback)

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/internal/cf/projects/resolve?subdomain=X` | `{ projectId, activeDeploymentId, updatedAt }` from Cloudflare KV |

> **Note:** This is a KV passthrough — the API reads from Cloudflare KV and returns it. The Worker calls this only on a KV miss.

#### InternalGitHubController — called internally by DeploymentService

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/internal/github/token/{projectId}` | `{ token: "decrypted_github_token" }` |

> Decrypts the owner's AES-encrypted GitHub access token stored in the User record. Returns 404 if GitHub not connected.

#### InternalProjectController — DEPRECATED

| Method | Endpoint | Notes |
|--------|----------|-------|
| `GET` | `/internal/projects/resolve?subdomain=X` | **Deprecated.** Was used by old Spring Boot S3 proxy. Migrated to Cloudflare Workers + KV. |

---

## activeDeploymentId Resolution Chain

This is how the system knows which deployment to serve for a given subdomain:

```mermaid
sequenceDiagram
    participant DS as DeploymentService
    participant DB as PostgreSQL
    participant KV as Cloudflare KV
    participant CF as Cloudflare Worker
    participant S3 as AWS S3

    DS->>DB: updateActiveDeployment(project, deployment, PRODUCTION)
    Note over DS,DB: Sets project.activeProductionDeploymentId = deployment.id
    DB-->>DS: saved

    DS->>KV: PUT resolve:subdomain
    Note over DS,KV: payload = projectId + activeDeploymentId + updatedAt

    Note over KV: KV is the global source of truth for routing

    CF->>KV: GET resolve:myapp
    KV-->>CF: projectId + activeDeploymentId

    CF->>S3: GET __outputs/projectId/deployments/activeDeploymentId/index.html
    S3-->>CF: file content
```

**Key insight:** The `activeDeploymentId` written to Cloudflare KV at deploy time is what the Worker uses to serve files. Promoting or rolling back a deployment updates this KV entry, instantly switching which build is served — no re-build needed.

---

## Data Models

### Project
```
id                           UUID
name                         String
subdomain                    String (unique)
gitURL                       String
userId                       FK -> User
maxConcurrentDeployments     Int (default 3)
customBuildCommand           String? (UI override)
customInstallCommand         String? (UI override)
customOutputDirectory        String? (UI override)
activeProductionDeploymentId String?
activeStagingDeploymentId    String?
```

### Deployment
```
id                String (env-commitHash)
projectId         FK -> Project
status            QUEUED | DEPLOYING | RUNNING | SUCCESS | FAILED
environment       PRODUCTION | STAGING
gitCommitHash     String
gitBranch         String
version           Int (auto-incremented)
ecsTaskArn        String?
deployedUrl       String?
errorMessage      String?
detectedFramework String? (expo, nextjs, angular, vite...)
buildCommand      String? (resolved)
installCommand    String? (resolved)
outputDirectory   String? (resolved)
lastAction        DEPLOYED | PROMOTED | ROLLED_BACK
createdAt         LocalDateTime
deployedAt        LocalDateTime?
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

## Framework Detection

Supported frameworks detected in priority order:

| Framework | Detection Signal | Default Build Dir |
|-----------|-----------------|-------------------|
| Expo | `app.json` with `expo` key | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| Angular | `angular.json` exists | `dist/appName` or `dist/appName/browser` |
| Next.js | `next` in dependencies | `out` (requires `output: 'export'`) |
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
UI Environment Variables  (UI_BUILD_COMMAND, UI_INSTALL_COMMAND, UI_OUTPUT_DIR)
        |
        v  (if not set)
gitway.config.json in repo root
        |
        v  (if not set)
Auto-detected defaults
```

---

## Infrastructure

| Component | Service | Details |
|-----------|---------|---------|
| API Server | AWS ECS | Spring Boot, port 8080 |
| Build Runner | AWS ECS Fargate | On-demand, 1 task per deployment |
| Database | AWS RDS PostgreSQL | Persistent storage |
| File Storage | AWS S3 | Static build outputs |
| Log Stream | Upstash Redis | Redis Streams (container-logs) |
| Log Consumer | Spring Boot | log-service-kafka/ |
| CDN + Proxy | Cloudflare Worker | Edge serving, KV routing |
| Domain Routing | Cloudflare KV | resolve:subdomain → projectId |
| Container Registry | AWS ECR | build-server Docker image |

---

## Security

| Token | Used By | Header |
|-------|---------|--------|
| JWT | Frontend → API | `Authorization: Bearer {token}` |
| PUSHLY_TOKEN | GitHub Actions → API | `Authorization: Bearer {token}` |
| INTERNAL_PROXY_TOKEN | Build Server → API | `X-Internal-Token` |
| INTERNAL_PROXY_TOKEN | Cloudflare Worker → API | `X-Internal-Token` |
| GITHUB_TOKEN | Build Server → GitHub | Injected into git clone URL |
| CLOUDFLARE_API_TOKEN | API → Cloudflare KV | `Authorization: Bearer` |

---

## Known Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| Redis XTRIM missing | High | Add `jedis.xtrim(streamKey, 1000, true)` after each batch |
| Field mismatch `f.get("message")` | High | Change to `f.get("log")` in LogService |
| Redis 528K commands/month | Medium | Increase block time from 2000ms to 5000ms |# Pushly — Full System Design

> **Pushly** is a static frontend deployment platform (like Vercel/Netlify).
> Users push code → GitHub Actions triggers a build → files land on S3 → served via Cloudflare Worker.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Developer["Developer Side"]
        GH["GitHub Repository"]
        GHA["GitHub Actions CI/CD"]
        DEV_PAGE["Developers Page\npushly-developers-page\nYAML Generator"]
    end

    subgraph UserDash["User Dashboard"]
        FE["Frontend\nNext.js\nfrontend/"]
    end

    subgraph Core["Core Platform\napi.wareality.tech"]
        API["API Server\nSpring Boot\napi-server/"]
        DB[("PostgreSQL\nProjects / Deployments\nUsers / Logs")]
    end

    subgraph BuildPipeline["Build Pipeline"]
        ECS["AWS ECS Fargate\nBuild Container"]
        DOCKER["Docker Image\nbuild-server\nmain.sh + script.js"]
        S3[("AWS S3\n__outputs/projectId/\ndeployments/deploymentId/")]
    end

    subgraph LogPipeline["Log Pipeline"]
        REDIS["Upstash Redis\nStream: container-logs"]
        LOG_SVC["Log Service\nSpring Boot\nlog-service-kafka/"]
    end

    subgraph ServeLayer["Serve Layer"]
        CF_WORKER["Cloudflare Worker\ns3-proxy"]
        CF_KV["Cloudflare KV\nresolve:subdomain\nprojectId + deploymentId"]
    end

    USER_BROWSER["End User Browser"]

    DEV_PAGE -->|"Generates GitHub Actions YAML"| GHA
    GH -->|"git push"| GHA
    GHA -->|"POST /api/projects/id/deployments"| API
    GHA -->|"POST /api/projects/id/deployments/id/deploy"| API
    FE -->|"REST API calls"| API
    API -->|"RunTask Fargate"| ECS
    ECS -->|"Runs"| DOCKER
    DOCKER -->|"git clone + build"| DOCKER
    DOCKER -->|"Upload static files"| S3
    DOCKER -->|"XADD logs"| REDIS
    DOCKER -->|"POST framework-detected"| API
    DOCKER -->|"POST complete"| API
    REDIS -->|"XREADGROUP"| LOG_SVC
    LOG_SVC -->|"Save logs"| DB
    API -->|"PUT KV resolve:subdomain"| CF_KV
    API -->|"Save deployment"| DB
    USER_BROWSER -->|"https://subdomain.wareality.tech"| CF_WORKER
    CF_WORKER -->|"KV lookup resolve:subdomain"| CF_KV
    CF_WORKER -->|"GET index.html"| S3
```

---

## Complete Flow: Push to Build to Deploy to Serve

### Phase 1: CI/CD Trigger (GitHub Actions)

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant GH as GitHub
    participant GHA as GitHub Actions
    participant API as API Server

    DEV->>GH: git push any branch
    GH->>GHA: Trigger workflow

    GHA->>GHA: Determine Environment
    Note over GHA: main branch = PRODUCTION, other branches = STAGING

    GHA->>API: POST /api/projects/PROJECT_ID/deployments
    Note over GHA,API: Auth: Bearer PUSHLY_TOKEN, Body: gitCommitHash + gitBranch + environment

    API-->>GHA: id + status QUEUED

    GHA->>API: POST /api/projects/PROJECT_ID/deployments/DEPLOYMENT_ID/deploy?environment=PRODUCTION
    Note over GHA,API: Auth: Bearer PUSHLY_TOKEN

    API-->>GHA: status RUNNING + ecsTaskArn
    GHA->>GHA: Deployment triggered successfully
```

**GitHub Secrets Required:**

| Secret | Value |
|--------|-------|
| `PROJECT_ID` | Your Pushly project ID |
| `PUSHLY_TOKEN` | JWT token from Pushly dashboard |
| `SLACK_WEBHOOK_URL` | (Optional) Slack notifications |

---

### Phase 2: API Server to ECS Trigger

```mermaid
sequenceDiagram
    participant API as API Server
    participant GH_CTRL as InternalGitHubController
    participant ECS_SVC as ECSService.java
    participant AWS as AWS ECS Fargate
    participant CF_KV as Cloudflare KV

    API->>API: createDeployment, save to DB, status QUEUED
    API->>API: processDeploymentAsync
    API->>API: deployToEnvironmentInternal, status DEPLOYING

    API->>GH_CTRL: GET /internal/github/token/projectId
    Note over API,GH_CTRL: Decrypts owner GitHub token for private repo access
    GH_CTRL-->>API: decrypted githubToken (or null if public)

    API->>ECS_SVC: runBuildTask(gitUrl, gitRef, env, projectId, deploymentId, githubToken)
    ECS_SVC->>AWS: RunTaskRequest, LaunchType FARGATE, Container builder-image, env vars injected
    AWS-->>ECS_SVC: taskArn
    ECS_SVC-->>API: taskArn

    API->>API: Save ecsTaskArn, status RUNNING
    API->>API: updateActiveDeployment(project, deployment, environment)
    Note over API: Sets project.activeProductionDeploymentId or activeStagingDeploymentId

    alt PRODUCTION deployment
        API->>CF_KV: PUT resolve:subdomain
        Note over API,CF_KV: payload = projectId + activeDeploymentId + updatedAt
    end
```

**ECS Environment Variables Injected:**

```
GIT_URL          = project.gitURL
GIT_REF          = deployment.gitBranch
ENV              = PRODUCTION or STAGING
PROJECT_ID       = project.id
DEPLOYMENT_ID    = deployment.id
INTERNAL_TOKEN   = INTERNAL_PROXY_TOKEN secret
API_URL          = https://api.wareality.tech
GITHUB_TOKEN     = encrypted token (private repos only)
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

    MAIN->>REDIS: XADD "Cloning repository..."
    MAIN->>MAIN: git clone GIT_URL
    MAIN->>MAIN: git checkout GIT_REF
    MAIN->>REDIS: XADD "Repository cloned successfully"
    MAIN->>SCRIPT: exec node script.js

    SCRIPT->>SCRIPT: detectFramework(outDirPath)
    Note over SCRIPT: Checks package.json, angular.json, app.json for 14 frameworks

    SCRIPT->>SCRIPT: validateFramework()
    Note over SCRIPT: Next.js checks output export in next.config.js/.mjs/.ts

    SCRIPT->>SCRIPT: resolveConfig()
    Note over SCRIPT: Priority: UI env vars > gitway.config.json > auto-detect

    SCRIPT->>API: POST /internal/deployments/id/framework-detected
    Note over SCRIPT,API: Body: framework + buildCommand + installCommand + outputDirectory

    SCRIPT->>REDIS: XADD "Installing dependencies..."
    SCRIPT->>SCRIPT: Run installCommand

    SCRIPT->>REDIS: XADD "Building..."
    SCRIPT->>SCRIPT: Run buildCommand

    alt Angular project
        SCRIPT->>SCRIPT: resolveAngularDeployDir()
        Note over SCRIPT: v15 and below = dist/app/, v16+ = dist/app/browser/
    end

    SCRIPT->>SCRIPT: walkAndUpload(distFolderPath)
    loop For each file in output dir
        SCRIPT->>S3: PutObject __outputs/projectId/deployments/deploymentId/file
    end

    SCRIPT->>API: POST /internal/deployments/id/complete
    Note over SCRIPT,API: X-Internal-Token header required
```

---

### Phase 4: Log Pipeline

```mermaid
sequenceDiagram
    participant BUILD as Build Container
    participant REDIS as Upstash Redis Stream
    participant LOG as Log Service Java
    participant DB as PostgreSQL

    BUILD->>REDIS: XADD container-logs with projectId + deploymentId + timestamp + log

    loop Every 2 seconds blocking poll
        LOG->>REDIS: XREADGROUP GROUP log-group consumer-1 COUNT 10 BLOCK 2000
        REDIS-->>LOG: List of StreamEntry

        loop For each entry
            LOG->>DB: INSERT deployment_logs
            LOG->>REDIS: XACK container-logs log-group entryId
        end

        Note over LOG,REDIS: MISSING: XTRIM to delete processed messages causes accumulation
    end
```

> **Issue:** `XACK` marks as read but does NOT delete. Add `jedis.xtrim(streamKey, 1000, true)` after each batch.

---

### Phase 5: Serve Flow (End User)

```mermaid
sequenceDiagram
    participant USER as End User Browser
    participant CF as Cloudflare Worker
    participant KV as Cloudflare KV
    participant S3 as AWS S3 Public

    USER->>CF: GET https://myapp.wareality.tech/about

    CF->>CF: Parse hostname, subdomain = myapp

    CF->>KV: GET resolve:myapp
    alt KV HIT
        KV-->>CF: projectId + activeDeploymentId
    else KV MISS
        CF->>CF: Fallback GET /internal/cf/projects/resolve?subdomain=myapp
    end

    CF->>S3: GET __outputs/projectId/deployments/deploymentId/about

    alt 404 and not a static asset
        CF->>S3: GET index.html
        Note over CF: SPA fallback for client-side routing
        CF-->>USER: index.html 200
    else File found
        CF->>CF: Set Cache-Control
        Note over CF: Static assets = max-age 31536000 immutable, HTML = no-cache
        CF-->>USER: File content
    end
```

**URL Formats:**

| Environment | URL Pattern |
|------------|-------------|
| Production | `https://{subdomain}.wareality.tech` |
| Staging | `https://{deploymentId}--{subdomain}.wareality.tech` |

---



### Phase 6: Custom Domain & SSL Provisioning

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant API as API Server
    participant CF_API as Cloudflare API
    participant LE as SSL Provider (Let's Encrypt)
    participant CF_KV as Cloudflare KV

    DEV->>API: POST /api/projects/{id}/custom-domain (domain="app.myorg.com")
    API->>CF_API: Create Custom Hostname (Cloudflare for SaaS fallback)
    CF_API-->>API: Required DNS Verification Records (TXT/CNAME)
    API-->>DEV: Return DNS verification instructions
    
    DEV->>DEV: Configures DNS provider (Route53, Namecheap, etc.)
    
    loop Real-time verification
        CF_API->>CF_API: Check DNS propagation
    end
    
    CF_API->>LE: Request Wildcard SSL/TLS Certificate
    LE-->>CF_API: Certificate Issued
    
    API->>CF_KV: PUT resolve:app.myorg.com → { projectId, activeDeploymentId }
    Note over API,CF_KV: Link domain to internal project routing
```

**Key Steps:**
1. **Request:** User requests mapping for a custom apex or sub-domain.
2. **Cloudflare SaaS Integration:** The API Server connects to Cloudflare to register a Custom Hostname targeting the Gitway Cloudflare Worker fallback.
3. **DNS Challenge:** The user provisions the necessary verification CNAME/TXT records at their registrar.
4. **Automated SSL:** Cloudflare dynamically validates the DNS, automatically issues an SSL/TLS certificate, and begins routing encrypted traffic identically to the `.wareality.tech` flow, mapped via the KV store.

---

## Key API Endpoints

### Public API — JWT Auth Required

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns JWT token |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects` | List user projects |
| `GET` | `/api/projects/{id}` | Get project details |
| `POST` | `/api/projects/{id}/deployments` | Create deployment (step 1) |
| `POST` | `/api/projects/{id}/deployments/{id}/deploy` | Trigger build (step 2) |
| `GET` | `/api/projects/{id}/deployments` | List deployments paginated |
| `GET` | `/api/projects/{id}/deployments/{id}` | Get deployment details |
| `POST` | `/api/projects/{id}/deployments/{id}/promote` | Promote staging to production |
| `POST` | `/api/projects/{id}/deployments/{id}/rollback` | Rollback to previous |
| `POST` | `/api/projects/{id}/deployments/{id}/stop` | Stop running ECS task |
| `DELETE` | `/api/projects/{id}/deployments/{id}` | Delete deployment |
| `GET` | `/api/projects/{id}/deployments/active` | Get active deployments per env |

### Internal API — X-Internal-Token Required

#### InternalDeploymentController — called by Build Server (ECS)

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| `POST` | `/internal/deployments/{id}/complete` | none | `{ success, deploymentId, status }` |
| `POST` | `/internal/deployments/{id}/failed` | `{ error: "message" }` | `{ success, deploymentId, status }` |
| `POST` | `/internal/deployments/{id}/framework-detected` | `{ framework, buildCommand, installCommand, outputDirectory }` | `{ success, deploymentId, framework }` |

#### InternalCloudFlareController — called by Cloudflare Worker (KV miss fallback)

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/internal/cf/projects/resolve?subdomain=X` | `{ projectId, activeDeploymentId, updatedAt }` from Cloudflare KV |

> **Note:** This is a KV passthrough — the API reads from Cloudflare KV and returns it. The Worker calls this only on a KV miss.

#### InternalGitHubController — called internally by DeploymentService

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/internal/github/token/{projectId}` | `{ token: "decrypted_github_token" }` |

> Decrypts the owner's AES-encrypted GitHub access token stored in the User record. Returns 404 if GitHub not connected.

#### InternalProjectController — DEPRECATED

| Method | Endpoint | Notes |
|--------|----------|-------|
| `GET` | `/internal/projects/resolve?subdomain=X` | **Deprecated.** Was used by old Spring Boot S3 proxy. Migrated to Cloudflare Workers + KV. |

---

## activeDeploymentId Resolution Chain

This is how the system knows which deployment to serve for a given subdomain:

```mermaid
sequenceDiagram
    participant DS as DeploymentService
    participant DB as PostgreSQL
    participant KV as Cloudflare KV
    participant CF as Cloudflare Worker
    participant S3 as AWS S3

    DS->>DB: updateActiveDeployment(project, deployment, PRODUCTION)
    Note over DS,DB: Sets project.activeProductionDeploymentId = deployment.id
    DB-->>DS: saved

    DS->>KV: PUT resolve:subdomain
    Note over DS,KV: payload = projectId + activeDeploymentId + updatedAt

    Note over KV: KV is the global source of truth for routing

    CF->>KV: GET resolve:myapp
    KV-->>CF: projectId + activeDeploymentId

    CF->>S3: GET __outputs/projectId/deployments/activeDeploymentId/index.html
    S3-->>CF: file content
```

**Key insight:** The `activeDeploymentId` written to Cloudflare KV at deploy time is what the Worker uses to serve files. Promoting or rolling back a deployment updates this KV entry, instantly switching which build is served — no re-build needed.

---

## Data Models

### Project
```
id                           UUID
name                         String
subdomain                    String (unique)
gitURL                       String
userId                       FK -> User
maxConcurrentDeployments     Int (default 3)
customBuildCommand           String? (UI override)
customInstallCommand         String? (UI override)
customOutputDirectory        String? (UI override)
activeProductionDeploymentId String?
activeStagingDeploymentId    String?
```

### Deployment
```
id                String (env-commitHash)
projectId         FK -> Project
status            QUEUED | DEPLOYING | RUNNING | SUCCESS | FAILED
environment       PRODUCTION | STAGING
gitCommitHash     String
gitBranch         String
version           Int (auto-incremented)
ecsTaskArn        String?
deployedUrl       String?
errorMessage      String?
detectedFramework String? (expo, nextjs, angular, vite...)
buildCommand      String? (resolved)
installCommand    String? (resolved)
outputDirectory   String? (resolved)
lastAction        DEPLOYED | PROMOTED | ROLLED_BACK
createdAt         LocalDateTime
deployedAt        LocalDateTime?
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

## Framework Detection

Supported frameworks detected in priority order:

| Framework | Detection Signal | Default Build Dir |
|-----------|-----------------|-------------------|
| Expo | `app.json` with `expo` key | [dist](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/dainikinfo/dist) |
| Angular | `angular.json` exists | `dist/appName` or `dist/appName/browser` |
| Next.js | `next` in dependencies | `out` (requires `output: 'export'`) |
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
UI Environment Variables  (UI_BUILD_COMMAND, UI_INSTALL_COMMAND, UI_OUTPUT_DIR)
        |
        v  (if not set)
gitway.config.json in repo root
        |
        v  (if not set)
Auto-detected defaults
```

---

## Infrastructure

| Component | Service | Details |
|-----------|---------|---------|
| API Server | AWS ECS | Spring Boot, port 8080 |
| Build Runner | AWS ECS Fargate | On-demand, 1 task per deployment |
| Database | AWS RDS PostgreSQL | Persistent storage |
| File Storage | AWS S3 | Static build outputs |
| Log Stream | Upstash Redis | Redis Streams (container-logs) |
| Log Consumer | Spring Boot | log-service-kafka/ |
| CDN + Proxy | Cloudflare Worker | Edge serving, KV routing |
| Domain Routing | Cloudflare KV | resolve:subdomain → projectId |
| Container Registry | AWS ECR | build-server Docker image |

---

## Security

| Token | Used By | Header |
|-------|---------|--------|
| JWT | Frontend → API | `Authorization: Bearer {token}` |
| PUSHLY_TOKEN | GitHub Actions → API | `Authorization: Bearer {token}` |
| INTERNAL_PROXY_TOKEN | Build Server → API | `X-Internal-Token` |
| INTERNAL_PROXY_TOKEN | Cloudflare Worker → API | `X-Internal-Token` |
| GITHUB_TOKEN | Build Server → GitHub | Injected into git clone URL |
| CLOUDFLARE_API_TOKEN | API → Cloudflare KV | `Authorization: Bearer` |

---

## Known Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| Redis XTRIM missing | High | Add `jedis.xtrim(streamKey, 1000, true)` after each batch |
| Field mismatch `f.get("message")` | High | Change to `f.get("log")` in LogService |
| Redis 528K commands/month | Medium | Increase block time from 2000ms to 5000ms |
