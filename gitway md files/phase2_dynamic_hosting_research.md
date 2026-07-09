# Pushly Phase 2 — Dynamic App Hosting: Detailed Architecture & Implementation Plan

> **Goal**: Support running server-side applications (Next.js server, NestJS, NestJS, Express, FastAPI, Flask, Django, Spring Boot) with auto-sleep after 30 minutes of inactivity — without breaking Phase 1 static hosting.

---

## 1. The Core Problem

Phase 1 serves **static files** — build once, upload to S3, serve forever. Zero ongoing compute cost.

Phase 2 apps are **live processes** — they need a container (CPU + RAM) running 24/7 to handle HTTP requests. This means:

- You need a **container registry** (AWS ECR) to store Docker images
- You need a **persistent compute runtime** (ECS Fargate Service, not a Task) to keep the container alive
- You need **traffic routing** from a subdomain to the right container
- You need an **auto-sleep mechanism** to stop idle containers (cost savings)
- You need an **auto-wake mechanism** when traffic comes back (serving a loading screen while the container cold-starts)

---

## 2. Full Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PHASE 2 FULL ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

USER TRIGGERS DEPLOY
        │
        ▼
┌─────────────────┐     JWT-authenticated REST      ┌──────────────────────────┐
│  Next.js        │◄────────────────────────────────►│  API Server              │
│  Frontend       │                                  │  (Spring Boot / Heroku)  │
│ (wareality.tech)│                                  │  api.wareality.tech      │
└─────────────────┘                                  └──────────────┬───────────┘
                                                                    │
                                                    ECS runTask()   │  Save to PostgreSQL
                                                                    ▼
                                                     ┌─────────────────────────┐
                                                     │  AWS ECS Fargate        │
                                                     │  BUILD TASK (ephemeral) │
                                                     │                         │
                                                     │  1. git clone repo      │
                                                     │  2. detect framework    │
                                                     │  3. generate Dockerfile │
                                                     │  4. docker build        │
                                                     │  5. docker push → ECR   │
                                                     │  6. POST /internal/     │
                                                     │     deployments/        │
                                                     │     {id}/complete       │
                                                     └─────────────────────────┘
                                                                    │
                                         callback received          │
                                                                    ▼
                                                     ┌──────────────────────────┐
                                                     │  API Server              │
                                                     │  on /complete callback:  │
                                                     │  • creates ECS Service   │
                                                     │  • attaches to ALB TG   │
                                                     │  • saves imageUri to DB  │
                                                     │  • sets status=RUNNING   │
                                                     └──────────────────────────┘

─────────────────────────────────────────────────────────────────────────────────
USER VISITS DEPLOYED APP
─────────────────────────────────────────────────────────────────────────────────

                          myapp.wareality.tech
                                │
                          ┌─────▼──────┐
                          │ Cloudflare │  (DNS wildcard → ALB)
                          └─────┬──────┘
                                │
                          ┌─────▼──────────────────────┐
                          │  AWS Application Load       │
                          │  Balancer (ALB)             │
                          │                             │
                          │  Listener rules:            │
                          │  myapp.* → TG-myapp         │
                          │  staging-xxx--.* → TG-xxx  │
                          └──────┬──────────────────────┘
                                 │
                    ┌────────────┴──────────────┐
                    │                           │
              ┌─────▼──────┐           ┌────────▼──────┐
              │  ECS        │           │  ECS           │
              │  Service    │           │  Service       │
              │  (myapp)    │           │  (staging-xxx) │
              │  Port 3000  │           │  Port 3000     │
              └─────────────┘           └────────────────┘

─────────────────────────────────────────────────────────────────────────────────
AUTO-SLEEP SYSTEM
─────────────────────────────────────────────────────────────────────────────────

                          myapp.wareality.tech
                                │
                          ┌─────▼──────────────────────┐
                          │  S3ProxyService (upgraded) │
                          │  Acts as Smart Router       │
                          │                             │
                          │  1. Check deployment type   │
                          │  2. If DYNAMIC:             │
                          │     a. Ping /internal/      │
                          │        sleep/check          │
                          │     b. If SLEEPING →        │
                          │        serve wake-up page   │
                          │        + trigger wake       │
                          │     c. If AWAKE →           │
                          │        proxy to ALB TG URL  │
                          │  3. If STATIC → S3 (as-is) │
                          └─────────────────────────────┘
                                        │
                                        │ update last seen
                                        ▼
                          ┌─────────────────────────────┐
                          │  Upstash Redis              │
                          │  Key: sleep:{deploymentId}  │
                          │  Value: lastSeenAt (epoch)  │
                          └─────────────────────────────┘
                                        │
                          ┌─────────────▼──────────────┐
                          │  API Server Sleep Watcher   │
                          │  @Scheduled(every 5 min)   │
                          │                             │
                          │  For each RUNNING dynamic   │
                          │  deployment:                │
                          │  • Check Redis lastSeenAt   │
                          │  • If > 30 min idle →       │
                          │    desiredCount=0 on ECS    │
                          │    Service (SLEEPING)       │
                          │  • Wake: desiredCount=1     │
                          └─────────────────────────────┘
```

---

## 3. Framework Detection Strategy

Your existing [framework-detector.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/framework-detector.js) already handles static frameworks. We need to **extend it** to also detect dynamic runtimes and mark them accordingly.

### Detection Logic (extended)

```
Repo cloned
    │
    ├── Has package.json?
    │       ├── next in deps AND output: "export" in next.config? → STATIC (phase 1)
    │       ├── next in deps, no output: "export"? → DYNAMIC (Next.js server)
    │       ├── @nestjs/core in deps? → DYNAMIC (NestJS)
    │       ├── express in deps? → DYNAMIC (Express)
    │       ├── vite in deps? → STATIC (Vite SPA)
    │       └── react-scripts? → STATIC (CRA)
    │
    ├── Has requirements.txt or pyproject.toml?
    │       ├── fastapi in requirements? → DYNAMIC (FastAPI)
    │       ├── flask in requirements? → DYNAMIC (Flask)
    │       └── django in requirements? → DYNAMIC (Django)
    │
    ├── Has pom.xml?
    │       └── → DYNAMIC (Spring Boot)
    │
    └── Has build.gradle?
            └── → DYNAMIC (Spring Boot / Gradle)
```

### New Field on [Deployment](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/frontend/app/project/%5Bid%5D/page.tsx#19-34) Model

```java
// Add to Deployment.java
public enum DeploymentType {
    STATIC,   // Phase 1: build → S3
    DYNAMIC   // Phase 2: build → Docker → ECR → ECS Service
}

@Enumerated(EnumType.STRING)
private DeploymentType deploymentType = DeploymentType.STATIC;

// Also store these for dynamic:
private String ecsServiceArn;    // The ECS Service ARN (not task ARN)
private String ecsImageUri;      // ECR Image URI: 123456.dkr.ecr.ap-south-1.amazonaws.com/pushly/myapp:abc123
private Integer appPort;         // Detected/configured app port (3000, 8080, 8000, etc.)
private String sleepStatus;      // AWAKE, SLEEPING, WAKING
private LocalDateTime lastSeenAt; // Last HTTP request time
```

---

## 4. Build Server Changes (Node.js)

This is where most of the new logic lives. The build server needs to:
1. Detect if the framework is dynamic
2. Generate the right Dockerfile
3. Build and push the Docker image to ECR (instead of uploading to S3)
4. Report back with the image URI and port

### 4.1 Framework Detector Extension ([framework-detector.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/framework-detector.js))

```javascript
// Add RUNTIME_TYPE to each framework definition
const STATIC_FRAMEWORKS = ['expo', 'angular', 'nextjs-static', 'vite', 'cra', 'gatsby', 'nuxt-static'];
const DYNAMIC_FRAMEWORKS = ['nextjs-server', 'nestjs', 'express', 'fastapi', 'flask', 'django', 'springboot'];

// New: detect dynamic runtimes
function detectRuntime(projectPath, log = console.log) {
    // Check for Java/Spring Boot
    if (fs.existsSync(path.join(projectPath, 'pom.xml')) || 
        fs.existsSync(path.join(projectPath, 'build.gradle'))) {
        return { name: 'springboot', type: 'DYNAMIC', port: 8080, lang: 'java' };
    }
    
    // Check Python
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
        const req = fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
        if (req.includes('fastapi')) return { name: 'fastapi', type: 'DYNAMIC', port: 8000, lang: 'python' };
        if (req.includes('flask'))   return { name: 'flask',   type: 'DYNAMIC', port: 5000, lang: 'python' };
        if (req.includes('django'))  return { name: 'django',  type: 'DYNAMIC', port: 8000, lang: 'python' };
    }
    
    // Check Node.js package.json
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        // Next.js: check if it's server mode (no output: export)
        if (deps.next) {
            const isStaticExport = isNextJsStaticExport(projectPath);
            if (!isStaticExport) {
                return { name: 'nextjs-server', type: 'DYNAMIC', port: 3000, lang: 'node' };
            }
        }
        
        if (deps['@nestjs/core']) return { name: 'nestjs', type: 'DYNAMIC', port: 3000, lang: 'node' };
        if (deps.express)         return { name: 'express', type: 'DYNAMIC', port: 3000, lang: 'node' };
    }
    
    return null; // Not dynamic
}
```

### 4.2 Dockerfile Generator (`dockerfile-generator.js` — NEW FILE)

```javascript
function generateDockerfile(framework, projectPath, userPort = null) {
    const port = userPort || framework.port;
    
    switch (framework.name) {
        case 'nextjs-server':
            return `
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE ${port}
CMD ["node", "server.js"]
            `;

        case 'nestjs':
            return `
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE ${port}
CMD ["node", "dist/main.js"]
            `;

        case 'express':
            return `
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE ${port}
CMD ["node", "index.js"]
            `;

        case 'fastapi':
            return `
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${port}
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${port}"]
            `;

        case 'flask':
            return `
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${port}
ENV FLASK_APP=app.py
CMD ["flask", "run", "--host=0.0.0.0", "--port=${port}"]
            `;

        case 'django':
            return `
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY . .
EXPOSE ${port}
CMD ["gunicorn", "--bind", "0.0.0.0:${port}", "--workers", "2", "wsgi:application"]
            `;

        case 'springboot':
            return `
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE ${port}
CMD ["java", "-jar", "app.jar"]
            `;
    }
}
```

### 4.3 Main Build Script ([script.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/script.js)) — New Dynamic Branch

```javascript
// In script.js, after framework detection:

const runtime = detectRuntime(outDirPath, publishLog);

if (runtime && runtime.type === 'DYNAMIC') {
    // ── DYNAMIC PATH ─────────────────────────────────────────
    publishLog(`🔥 Dynamic framework detected: ${runtime.name} (port ${runtime.port})`);
    
    // 1. Generate and write Dockerfile
    const dockerfile = generateDockerfile(runtime, outDirPath);
    fs.writeFileSync(path.join(outDirPath, 'Dockerfile'), dockerfile);
    publishLog(`📦 Generated Dockerfile for ${runtime.name}`);
    
    // 2. ECR login
    const ecrUrl = `${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com`;
    await execAsync(`aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ecrUrl}`);
    
    // 3. Build Docker image
    const imageTag = `${ecrUrl}/pushly-apps:${DEPLOYMENT_ID}`;
    publishLog(`🐳 Building Docker image: ${imageTag}`);
    await execAsync(`docker build -t ${imageTag} ${outDirPath}`);
    
    // 4. Push to ECR
    publishLog(`⬆️ Pushing to ECR...`);
    await execAsync(`docker push ${imageTag}`);
    publishLog(`✅ Image pushed: ${imageTag}`);
    
    // 5. Notify API (with image URI and port in body)
    await notifyDeploymentComplete(true, null, {
        imageUri: imageTag,
        port: runtime.port,
        framework: runtime.name,
        deploymentType: 'DYNAMIC'
    });

} else {
    // ── STATIC PATH (existing Phase 1 logic) ─────────────────
    // ... existing S3 upload code unchanged
}
```

---

## 5. API Server Changes (Spring Boot)

### 5.1 New `ECSAppService.java` — manages persistent ECS Services

```java
@Service
public class ECSAppService {

    // Existing ECSService handles build tasks.
    // This new service handles persistent app services.

    // Create a new ECS Service for a deployed app
    public String createAppService(String deploymentId, String imageUri, int port, String subdomain) {
        String serviceName = "app-" + deploymentId;
        String targetGroupArn = createAlbTargetGroup(serviceName, port);
        createAlbListenerRule(targetGroupArn, subdomain, deploymentId);
        
        CreateServiceRequest request = CreateServiceRequest.builder()
            .cluster(ecsCluster)
            .serviceName(serviceName)
            .taskDefinition(createTaskDefinition(serviceName, imageUri, port))
            .desiredCount(1)
            .launchType(LaunchType.FARGATE)
            .networkConfiguration(/* same VPC/subnets as build tasks */)
            .loadBalancers(LoadBalancer.builder()
                .targetGroupArn(targetGroupArn)
                .containerName("app")
                .containerPort(port)
                .build())
            .build();
        
        CreateServiceResponse response = ecsClient.createService(request);
        return response.service().serviceArn();
    }
    
    // Sleep: set desiredCount to 0
    public void sleepService(String ecsServiceArn) {
        ecsClient.updateService(UpdateServiceRequest.builder()
            .cluster(ecsCluster)
            .service(ecsServiceArn)
            .desiredCount(0)
            .build());
    }
    
    // Wake: set desiredCount back to 1
    public void wakeService(String ecsServiceArn) {
        ecsClient.updateService(UpdateServiceRequest.builder()
            .cluster(ecsCluster)
            .service(ecsServiceArn)
            .desiredCount(1)
            .build());
    }
    
    // Delete service on deployment deletion
    public void deleteAppService(String ecsServiceArn) {
        ecsClient.updateService(/* desiredCount=0 */);
        ecsClient.deleteService(/* force=true */);
    }
    
    private String createAlbTargetGroup(String name, int port) {
        // Creates a Target Group on your ALB pointing to port
        // Returns the Target Group ARN
    }
    
    private void createAlbListenerRule(String tgArn, String subdomain, String deploymentId) {
        // Adds a Host header condition listener rule on ALB:
        // IF Host = deploymentId--subdomain.wareality.tech → forward to TG
        // IF Host = subdomain.wareality.tech → forward to TG (production)
        // Uses weighted routing: 100 to this TG
    }
    
    private String createTaskDefinition(String name, String imageUri, int port) {
        // Creates an ECS Task Definition with the container image
        // Injects env vars from DB for this project
        // Sets memory/CPU (256 CPU, 512 MB for free tier)
        // Returns task definition ARN
    }
}
```

### 5.2 Updated `DeploymentService.markDeploymentComplete()`

```java
// This method is called by the build-server callback
public Deployment markDeploymentComplete(String deploymentId, DynamicCompletePayload payload) {
    Deployment deployment = deploymentRepository.findById(deploymentId)
        .orElseThrow(() -> new RuntimeException("Deployment not found"));

    if (payload != null && "DYNAMIC".equals(payload.getDeploymentType())) {
        // Phase 2 path: create ECS Service
        deployment.setDeploymentType(Deployment.DeploymentType.DYNAMIC);
        deployment.setEcsImageUri(payload.getImageUri());
        deployment.setAppPort(payload.getPort());
        deployment.setDetectedFramework(payload.getFramework());
        
        // Create the actual ECS Service that will run the app
        String serviceArn = ecsAppService.createAppService(
            deploymentId,
            payload.getImageUri(),
            payload.getPort(),
            deployment.getProject().getSubdomain()
        );
        deployment.setEcsServiceArn(serviceArn);
        deployment.setSleepStatus("AWAKE");
        deployment.setLastSeenAt(LocalDateTime.now());
        deployment.setStatus(Deployment.Status.SUCCESS);
        
    } else {
        // Phase 1 path: just mark success
        deployment.setStatus(Deployment.Status.SUCCESS);
    }
    
    return deploymentRepository.save(deployment);
}

// DTO for dynamic complete callback body:
// { "deploymentType": "DYNAMIC", "imageUri": "xxx.dkr.ecr.../pushly-apps:staging-abc123", "port": 3000, "framework": "nestjs" }
```

### 5.3 Auto-Sleep Scheduler (`SleepWatcherService.java` — NEW)

```java
@Service
@EnableScheduling
public class SleepWatcherService {
    
    private static final int IDLE_MINUTES_THRESHOLD = 30;
    
    @Autowired private DeploymentRepository deploymentRepository;
    @Autowired private ECSAppService ecsAppService;
    @Autowired private RedisService redisService; // wrapper around Upstash
    
    @Scheduled(fixedDelay = 5 * 60 * 1000) // every 5 minutes
    public void checkIdleDeployments() {
        List<Deployment> running = deploymentRepository
            .findByDeploymentTypeAndSleepStatus(DeploymentType.DYNAMIC, "AWAKE");
        
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(IDLE_MINUTES_THRESHOLD);
        
        for (Deployment d : running) {
            // Check last activity from Redis (more real-time than DB)
            Long lastSeenEpoch = redisService.getLastSeen(d.getId());
            LocalDateTime lastSeen = lastSeenEpoch != null 
                ? LocalDateTime.ofEpochSecond(lastSeenEpoch, 0, ZoneOffset.UTC)
                : d.getLastSeenAt();
            
            if (lastSeen != null && lastSeen.isBefore(cutoff)) {
                System.out.println("💤 Sleeping idle deployment: " + d.getId());
                ecsAppService.sleepService(d.getEcsServiceArn()); // set desiredCount=0
                d.setSleepStatus("SLEEPING");
                deploymentRepository.save(d);
            }
        }
    }
}
```

### 5.4 New Internal Endpoints for Sleep/Wake

```java
// In InternalDeploymentController.java — new endpoints
@PostMapping("/{deploymentId}/wake")
public ResponseEntity<?> wakeDeployment(
    @PathVariable String deploymentId,
    @RequestHeader(value = "X-Internal-Token", required = false) String token) {
    
    if (token == null || !token.equals(INTERNAL_TOKEN)) {
        return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
    
    Deployment d = deploymentService.wakeDeployment(deploymentId);
    return ResponseEntity.ok(Map.of(
        "status", d.getSleepStatus(),
        "ecsServiceArn", d.getEcsServiceArn()
    ));
}

@GetMapping("/{deploymentId}/sleep-status")
public ResponseEntity<?> getSleepStatus(
    @PathVariable String deploymentId,
    @RequestHeader(value = "X-Internal-Token", required = false) String token) {
    
    Deployment d = deploymentRepository.findById(deploymentId)
        .orElseThrow(() -> new RuntimeException("Not found"));
    
    return ResponseEntity.ok(Map.of(
        "sleepStatus", d.getSleepStatus(),
        "deploymentType", d.getDeploymentType(),
        "appPort", d.getAppPort()
    ));
}
```

---

## 6. Auto-Sleep / Auto-Wake System (Detailed)

This is the most complex new piece. Here's the exact flow:

```
─────────────────────────────────────────────────────────────────────────────
GOING TO SLEEP (idle container)
─────────────────────────────────────────────────────────────────────────────

SleepWatcher (every 5 min via @Scheduled):
  1. Query DB: all DYNAMIC deployments with sleepStatus = AWAKE
  2. For each, check Redis key "last_seen:{deploymentId}"
  3. If now - lastSeen > 30 minutes:
     a. Call ECS UpdateService(desiredCount=0) → container stops (cost = $0)
     b. Set sleepStatus = SLEEPING in DB
     c. Log: "💤 Deployment {id} sleeping after idle"

─────────────────────────────────────────────────────────────────────────────
WAKING UP (new request arrives)
─────────────────────────────────────────────────────────────────────────────

Request hits S3ProxyService:
  1. Look up deployment: is it DYNAMIC?
  2. Check sleepStatus via /internal/{id}/sleep-status
  3. If SLEEPING:
     a. Immediately POST /internal/{id}/wake → ECS UpdateService(desiredCount=1)
     b. Set sleepStatus = WAKING in DB
     c. Serve "Waking up..." HTML page to user (with auto-refresh every 5 sec)
     d. Return 200 with loading HTML
  4. If WAKING (container is starting):
     a. Check if ECS task is healthy (ECS describe-service → runningCount > 0)
     b. If still starting → serve "Still waking up..." page
     c. If ready → update sleepStatus = AWAKE, proxy request
  5. If AWAKE:
     a. Update Redis: SET last_seen:{id} = now (fire-and-forget)
     b. Reverse-proxy request to the ECS container via ALB

─────────────────────────────────────────────────────────────────────────────
WAKE-UP PAGE (HTML served to user)
─────────────────────────────────────────────────────────────────────────────

<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="5">  ← auto-refresh every 5 sec
  <title>Waking up... | Pushly</title>
</head>
<body style="display:flex; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background:#0a0a0a; color:#fff">
  <div style="text-align:center">
    <div class="spinner"></div>
    <h2>⚡ Starting your app</h2>
    <p style="color:#888">This usually takes 15–30 seconds.<br>You'll be automatically redirected.</p>
    <p style="color:#555; font-size:12px">Powered by Pushly</p>
  </div>
</body>
</html>
```

### Wake-Up Time Expectations

| Framework | Cold Start Time |
|---|---|
| Next.js / Express / NestJS | ~10–20 seconds |
| FastAPI / Flask | ~8–15 seconds |
| Django | ~15–25 seconds |
| Spring Boot | ~25–45 seconds |

---

## 7. S3ProxyService Changes (Spring Boot)

The S3ProxyService is the **entry point for all deployed app traffic**. It needs to become a **smart router**:

```java
@RequestMapping("/**")
public void proxy(HttpServletRequest request, HttpServletResponse response) throws Exception {
    String hostPart = request.getServerName().split("\\.")[0];
    
    // Parse subdomain/deploymentId (same as current logic)
    String subdomain, deploymentId = null;
    if (hostPart.contains("--")) {
        String[] parts = hostPart.split("--", 2);
        deploymentId = parts[0];
        subdomain = parts[1];
    } else {
        subdomain = hostPart;
    }
    
    // Resolve project + deployment via API (same call as today)
    ProjectResolveResponse resolved = resolveProject(subdomain, deploymentId);
    
    if (resolved.getDeploymentType() == STATIC) {
        // ── EXISTING PHASE 1 LOGIC ──
        serveFromS3(request, response, resolved.getProjectId(), resolved.getActiveDeploymentId());
        
    } else {
        // ── NEW PHASE 2 LOGIC ──
        routeToDynamicDeployment(request, response, resolved);
    }
}

private void routeToDynamicDeployment(
        HttpServletRequest request, 
        HttpServletResponse response,
        ProjectResolveResponse resolved) throws Exception {
    
    String deploymentId = resolved.getActiveDeploymentId();
    String sleepStatus = resolved.getSleepStatus();
    
    // Update last-seen in Redis (non-blocking)
    updateLastSeen(deploymentId);
    
    if ("SLEEPING".equals(sleepStatus)) {
        // Trigger wake up
        triggerWake(deploymentId);
        serveWakeUpPage(response);
        return;
    }
    
    if ("WAKING".equals(sleepStatus)) {
        // Check if actually ready yet
        if (!isContainerReady(deploymentId)) {
            serveWakeUpPage(response);
            return;
        }
        // Mark awake and fall through to proxy
        markAwake(deploymentId);
    }
    
    // AWAKE: reverse proxy to the app container via ALB
    // The ALB URL for this deployment:
    // http://internal-xxx.elb.amazonaws.com (ALB internal DNS)
    // ALB listener rule routes by Host header to the right Target Group
    String albUrl = "http://" + ALB_INTERNAL_DNS;
    reverseProxyTo(request, response, albUrl, resolved.getSubdomain() + ".wareality.tech");
}
```

---

## 8. Database Schema Changes

```sql
-- Add to deployments table:
ALTER TABLE deployments ADD COLUMN deployment_type VARCHAR(10) DEFAULT 'STATIC';
ALTER TABLE deployments ADD COLUMN ecs_service_arn VARCHAR(500);
ALTER TABLE deployments ADD COLUMN ecs_image_uri VARCHAR(500);
ALTER TABLE deployments ADD COLUMN app_port INTEGER;
ALTER TABLE deployments ADD COLUMN sleep_status VARCHAR(20) DEFAULT 'AWAKE';
ALTER TABLE deployments ADD COLUMN last_seen_at TIMESTAMP;
```

---

## 9. Frontend Changes

### 9.1 New Project Creation — Project Type Selection

Add a toggle when creating a project:
```
● Static Site    (Vite, CRA, Angular, Remix, etc.)   → Phase 1
○ Dynamic App    (Next.js server, NestJS, Flask, Django, Spring Boot) → Phase 2
```

Save as `projectType: STATIC | DYNAMIC` on the Project model.

> **Note**: If the user selects Dynamic, the build server auto-detects the framework from the code. They don't need to manually choose Flask vs Django etc.

### 9.2 Deployment Card — Sleep Status Badge

Show a sleep indicator on the deployment card:

```tsx
{d.deploymentType === 'DYNAMIC' && (
  <span className={`badge ${d.sleepStatus === 'SLEEPING' ? 'badge-gray' : 'badge-green'}`}>
    {d.sleepStatus === 'SLEEPING' ? '💤 Sleeping' : '⚡ Awake'}
  </span>
)}
```

### 9.3 Manual Wake Button

```tsx
{d.sleepStatus === 'SLEEPING' && (
  <Button onClick={() => wakeDeployment(d.id)} size="sm" variant="outline">
    ⚡ Wake Up
  </Button>
)}
```

---

## 10. AWS Infrastructure to Add

| Resource | Purpose | Notes |
|---|---|---|
| **AWS ECR Repository** | Store Docker images | 1 repo: `pushly-apps`, tag by `deploymentId` |
| **ALB (Application Load Balancer)** | Route traffic to ECS Services | One ALB for all dynamic apps |
| **ALB Listener (port 80/443)** | Host-based routing rules | Add rule per deployment |
| **ECS Service per deployment** | Run the container persistently | desiredCount=0 when sleeping |
| **ECS Task Definition per deployment** | Container config (image, port, env vars) | Created on first deploy |
| **IAM Role for ECS tasks** | Build task needs `ecr:GetAuthorizationToken`, `ecr:PutImage` | Add to existing ECS task role |
| **Security Group** | ALB → ECS communication on app port | Allow inbound from ALB SG |

---

## 11. Implementation Order (Phased)

### Phase 2A — Infrastructure + Node.js (Week 1–2)
- [ ] Create ECR repository
- [ ] Provision ALB + set up wildcard DNS via Cloudflare
- [ ] Add IAM permissions for docker push from ECS build task
- [ ] Extend [framework-detector.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/framework-detector.js) to detect `nextjs-server`, `nestjs`, `express`
- [ ] Add `dockerfile-generator.js` for Node.js frameworks
- [ ] Update [script.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/script.js) with dynamic branch (docker build → ECR push)
- [ ] Add `DeploymentType`, `ecsServiceArn`, `ecsImageUri`, `appPort`, `sleepStatus` fields to [Deployment](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/frontend/app/project/%5Bid%5D/page.tsx#19-34) model
- [ ] Create `ECSAppService.java` (`createAppService`, `sleepService`, `wakeService`)
- [ ] Update [markDeploymentComplete](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Controller/Internal/InternalDeploymentController.java#27-66) to handle dynamic payload
- [ ] Update [InternalDeploymentController](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Controller/Internal/InternalDeploymentController.java#17-139) for dynamic complete body
- [ ] Create `SleepWatcherService.java` (scheduled job)
- [ ] Add wake/sleep-status internal endpoints
- [ ] Update `S3ProxyService` to detect type + proxy to ALB
- [ ] Frontend: add project type toggle

**Test**: Deploy a NestJS app end-to-end locally

### Phase 2B — Python Support (Week 3)
- [ ] Add Python detection (FastAPI, Flask, Django) to [framework-detector.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/framework-detector.js)
- [ ] Add Python Dockerfiles to `dockerfile-generator.js`

**Test**: Deploy a FastAPI app

### Phase 2C — Spring Boot Support (Week 4)
- [ ] Add Maven/Gradle detection
- [ ] Add Spring Boot multi-stage Dockerfile with caching
- [ ] Tune health check wait time (Spring Boot cold starts ~30s)

**Test**: Deploy a Spring Boot app

### Phase 2D — Auto-Sleep Polish (Week 5)
- [ ] Add wake-up page design
- [ ] Auto-refresh behavior
- [ ] Frontend sleep status badge + manual wake button
- [ ] ALB listener rule limit handling (100 rules per listener — use multiple listeners or path-based routing if needed)

---

## 12. Cost Model for Dynamic Apps

Running a 0.25 vCPU / 512 MB Fargate container 24/7:
- **Always-on**: ~$10/month per container
- **With 30-min auto-sleep**: if app gets 2 hours traffic/day → ~$0.83/month

Auto-sleep is critical for your free tier to be economically viable.

---

## 13. Key Decisions to Make Before Starting

| Decision | Options | Recommendation |
|---|---|---|
| **Port**: how does build-server know the app port? | A) Fixed defaults per framework  B) User sets in project settings | Start with A (fixed defaults), add B in UI later |
| **Health check path** | A) Always `/` B) Require `/health` endpoint | Use `/` with a 30s grace period |
| **ECR image retention** | Keep all images or clean up old ones? | Keep last 5 per project, auto-delete older |
| **Build machine needs Docker** | ECS build task needs Docker-in-Docker (DinD) | Use AWS CodeBuild for image builds instead (no DinD issues) |
| **ALB cost** | ALB = ~$16/month fixed + $0.008/LCU | Single ALB shared across all apps |
| **Sleep threshold** | 30 min hardcoded or user-configurable? | Hardcoded for now, UI setting later |

> ⚠️ **Important**: ECS Fargate build tasks **cannot run Docker** (no Docker daemon available). For `docker build` + `docker push`, you have two options:
> - **Option A**: Use **AWS CodeBuild** (triggered by the API server) instead of ECS for dynamic builds
> - **Option B**: Use **Kaniko** (Google's daemonless Docker builder) inside ECS
> 
> **Recommendation: Use AWS CodeBuild for dynamic builds.** It natively supports Docker, has better caching, and is purpose-built for this.
