# Custom Domain Support — Full Implementation Guide

## Overview

Users currently get: `https://{subdomain}.wareality.tech`  
Goal: Also serve at `https://mycustomdomain.com`

Everything runs through the **Cloudflare Worker**. The worker already uses a KV store keyed by subdomain (`resolve:{subdomain}`) to find the project. The custom domain solution works the **same way** — we just add a second KV key: `resolve-custom:{customDomain}` → same payload.

Cloudflare is your registrar / DNS provider for `wareality.tech`, which means you also have full access to the **Cloudflare API** to programmatically verify and proxy custom domains.

---

## Architecture at a Glance

```
User's custom domain: mycustomdomain.com
        │
        │  DNS: CNAME  mycustomdomain.com → proxy.wareality.tech
        │  (user sets this in their registrar)
        │
        ▼
┌──────────────────────────────────┐
│  Cloudflare (your zone)          │
│  wareality.tech                  │
│                                  │
│  proxy.wareality.tech is         │
│  pointing to the same Worker     │
│  (via Cloudflare for SaaS or     │
│  Custom Hostname feature)        │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Cloudflare Worker               │
│  (your existing worker)          │
│                                  │
│  If hostname ≠ *.wareality.tech  │
│    → look up KV:                 │
│      resolve-custom:{hostname}   │
│    → get { projectId,            │
│            activeDeploymentId }  │
│    → serve from S3 (same logic)  │
└──────────────────────────────────┘
```

---

## How DNS Verification Works

Before we trust a user's custom domain, we must **prove they own it**. Standard approach (used by Vercel, Netlify, Railway):

```
1. User adds  mycustomdomain.com  in Pushly dashboard
2. API generates a unique verification token: "pushly-verify-a1b2c3d4"
3. User must add a TXT record to their domain:
       _pushly-verify.mycustomdomain.com  →  "pushly-verify-a1b2c3d4"
4. User clicks "Verify" in Pushly dashboard
5. API does a DNS TXT lookup on _pushly-verify.mycustomdomain.com
6. If value matches → domain is verified → write KV entry
7. User then adds the CNAME:
       mycustomdomain.com  →  proxy.wareality.tech
```

---

## Step-by-Step Implementation

---

### STEP 1 — Cloudflare: Custom Hostnames (Cloudflare for SaaS)

You need to enable **Cloudflare for SaaS** on your zone. This allows external domains (`mycustomdomain.com`) to route through your Cloudflare zone and be served by your Worker, **with their own SSL certificates automatically provisioned**.

**Setup (one time, in Cloudflare Dashboard):**
1. Go to `wareality.tech` zone → **SSL/TLS** → **Custom Hostnames**
2. Enable "Cloudflare for SaaS" (requires **Paid plan** or Enterprise, but there's a free tier for the first 100 custom hostnames)
3. Set the **Fallback origin** to `proxy.wareality.tech` (create a DNS A/CNAME record for this pointing to your worker)

**What this achieves:**
- When `mycustomdomain.com` has `CNAME → proxy.wareality.tech`, Cloudflare picks up that traffic
- Cloudflare auto-provisions SSL via Let's Encrypt for `mycustomdomain.com`
- Your Worker handles the request — seeing `hostname = mycustomdomain.com`

**API to create a Custom Hostname (called from api-server when user verifies domain):**
```
POST https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames
Authorization: Bearer {CF_API_TOKEN}
Content-Type: application/json

{
  "hostname": "mycustomdomain.com",
  "ssl": {
    "method": "http",
    "type": "dv",
    "settings": { "min_tls_version": "1.2" }
  }
}
```

---

### STEP 2 — Database: Add Custom Domain Fields to Project

**[Project.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Project.java)** — add two new fields:
```java
// Custom domain and its verification state
@Column(unique = true)
@Size(max = 255)
private String customDomain;          // e.g. "mycustomdomain.com"

private String customDomainStatus;    // PENDING | VERIFYING | ACTIVE | FAILED

private String customDomainVerifyToken; // e.g. "pushly-verify-a1b2c3d4"

private String customDomainCfHostnameId; // Cloudflare Custom Hostname ID (for deletion later)
```

**Migration SQL:**
```sql
ALTER TABLE projects ADD COLUMN custom_domain VARCHAR(255) UNIQUE;
ALTER TABLE projects ADD COLUMN custom_domain_status VARCHAR(20) DEFAULT 'NONE';
ALTER TABLE projects ADD COLUMN custom_domain_verify_token VARCHAR(100);
ALTER TABLE projects ADD COLUMN custom_domain_cf_hostname_id VARCHAR(100);
```

---

### STEP 3 — API Server: New Custom Domain Endpoints

Add to [ProjectController.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Controller/ProjectController.java):

```java
// POST /api/projects/{projectId}/custom-domain
// User calls this to START the process of adding a custom domain
@PostMapping("/{projectId}/custom-domain")
public ResponseEntity<?> addCustomDomain(
        @PathVariable String projectId,
        @RequestBody Map<String, String> body,
        Authentication auth) {
    try {
        String userEmail = auth.getName();
        String domain = body.get("domain"); // "mycustomdomain.com"
        
        Map<String, String> result = projectService.initCustomDomain(projectId, domain, userEmail);
        return ResponseEntity.ok(result);
        // Returns: { "verifyToken": "pushly-verify-a1b2c3d4",
        //            "txtRecord": "_pushly-verify.mycustomdomain.com",
        //            "cnameTarget": "proxy.wareality.tech" }
    } catch (Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}

// POST /api/projects/{projectId}/custom-domain/verify
// User clicks "Verify" after adding TXT record
@PostMapping("/{projectId}/custom-domain/verify")
public ResponseEntity<?> verifyCustomDomain(
        @PathVariable String projectId,
        Authentication auth) {
    try {
        String userEmail = auth.getName();
        Map<String, Object> result = projectService.verifyCustomDomain(projectId, userEmail);
        return ResponseEntity.ok(result);
        // Returns: { "verified": true/false, "status": "ACTIVE"/"FAILED", "error": "..." }
    } catch (Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}

// DELETE /api/projects/{projectId}/custom-domain
// Remove custom domain from project
@DeleteMapping("/{projectId}/custom-domain")
public ResponseEntity<?> removeCustomDomain(
        @PathVariable String projectId,
        Authentication auth) {
    try {
        String userEmail = auth.getName();
        projectService.removeCustomDomain(projectId, userEmail);
        return ResponseEntity.ok(Map.of("removed", true));
    } catch (Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
```

---

### STEP 4 — API Server: ProjectService Custom Domain Logic

Add to [ProjectService.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Service/ProjectService.java):

```java
// STEP A: User submits their custom domain → generate verify token
public Map<String, String> initCustomDomain(String projectId, String domain, String userEmail) {
    Project project = getProject(projectId, userEmail);
    
    // Validate domain format (basic)
    if (!domain.matches("^([a-z0-9-]+\\.)+[a-z]{2,}$")) {
        throw new IllegalArgumentException("Invalid domain format");
    }
    
    // Check domain not already used by another project
    if (projectRepository.existsByCustomDomain(domain)) {
        throw new IllegalArgumentException("Domain already in use");
    }
    
    // Generate unique verify token
    String verifyToken = "pushly-verify-" + UUID.randomUUID().toString().substring(0, 8);
    
    project.setCustomDomain(domain);
    project.setCustomDomainStatus("PENDING");
    project.setCustomDomainVerifyToken(verifyToken);
    projectRepository.save(project);
    
    return Map.of(
        "verifyToken", verifyToken,
        "txtRecord",   "_pushly-verify." + domain,
        "txtValue",    verifyToken,
        "cnameRecord", domain,
        "cnameTarget", "proxy.wareality.tech"
    );
}

// STEP B: Verify domain ownership via DNS TXT lookup
public Map<String, Object> verifyCustomDomain(String projectId, String userEmail) {
    Project project = getProject(projectId, userEmail);
    
    String domain = project.getCustomDomain();
    String expectedToken = project.getCustomDomainVerifyToken();
    
    if (domain == null || expectedToken == null) {
        throw new IllegalStateException("Custom domain not initialized");
    }
    
    try {
        // DNS TXT lookup on _pushly-verify.{domain}
        String txtHost = "_pushly-verify." + domain;
        boolean verified = dnsVerificationService.checkTxtRecord(txtHost, expectedToken);
        
        if (!verified) {
            project.setCustomDomainStatus("FAILED");
            projectRepository.save(project);
            return Map.of("verified", false, "error", 
                "TXT record not found. Please add: " + txtHost + " → " + expectedToken);
        }
        
        // DNS verified → register as Cloudflare Custom Hostname (for SSL)
        String cfHostnameId = cloudflareService.createCustomHostname(domain);
        project.setCustomDomainCfHostnameId(cfHostnameId);
        project.setCustomDomainStatus("ACTIVE");
        projectRepository.save(project);
        
        // Write KV entry: resolve-custom:{domain} → same payload as resolve:{subdomain}
        Deployment activeProd = project.getActiveProductionDeployment();
        resolveProjectService.updateCustomDomainResolve(project, activeProd);
        
        return Map.of("verified", true, "status", "ACTIVE");
        
    } catch (Exception e) {
        project.setCustomDomainStatus("FAILED");
        projectRepository.save(project);
        return Map.of("verified", false, "error", e.getMessage());
    }
}

// STEP C: Remove custom domain
public void removeCustomDomain(String projectId, String userEmail) {
    Project project = getProject(projectId, userEmail);
    
    String domain = project.getCustomDomain();
    String cfHostnameId = project.getCustomDomainCfHostnameId();
    
    // Delete Cloudflare Custom Hostname (removes SSL cert too)
    if (cfHostnameId != null) {
        cloudflareService.deleteCustomHostname(cfHostnameId);
    }
    
    // Delete KV entry
    if (domain != null) {
        resolveProjectService.deleteCustomDomainResolve(domain);
    }
    
    project.setCustomDomain(null);
    project.setCustomDomainStatus("NONE");
    project.setCustomDomainVerifyToken(null);
    project.setCustomDomainCfHostnameId(null);
    projectRepository.save(project);
}
```

---

### STEP 5 — DNS Verification Service (`DnsVerificationService.java` — NEW)

```java
@Service
public class DnsVerificationService {
    
    /**
     * Checks if the TXT record at 'host' contains 'expectedValue'
     * Uses Java's built-in DNS resolver (or you can use Cloudflare's DNS API for reliability)
     */
    public boolean checkTxtRecord(String host, String expectedValue) {
        try {
            // Use Google's DNS-over-HTTPS for reliability (avoids JVM DNS caching issues)
            String dohUrl = "https://dns.google/resolve?name=" 
                + URLEncoder.encode(host, "UTF-8") + "&type=TXT";
            
            HttpURLConnection conn = (HttpURLConnection) new URL(dohUrl).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            
            if (conn.getResponseCode() != 200) return false;
            
            String body = new String(conn.getInputStream().readAllBytes());
            // body is JSON: { "Answer": [{ "data": "\"pushly-verify-abc123\"" }] }
            
            // Simple string check (use Jackson for proper parsing in prod)
            return body.contains(expectedValue);
            
        } catch (Exception e) {
            System.err.println("DNS lookup failed: " + e.getMessage());
            return false;
        }
    }
}
```

---

### STEP 6 — CloudflareService (`CloudflareService.java` — NEW or extend existing)

```java
@Service
public class CloudflareService {
    
    @Value("${CLOUDFLARE_API_TOKEN}")
    private String apiToken;
    
    @Value("${CLOUDFLARE_ZONE_ID}")
    private String zoneId;
    
    // Register a custom hostname (provisions SSL automatically)
    public String createCustomHostname(String hostname) throws Exception {
        String url = "https://api.cloudflare.com/client/v4/zones/" + zoneId + "/custom_hostnames";
        
        String body = """
            {
              "hostname": "%s",
              "ssl": { "method": "http", "type": "dv", "settings": { "min_tls_version": "1.2" } }
            }
            """.formatted(hostname);
        
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Authorization", "Bearer " + apiToken);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        conn.getOutputStream().write(body.getBytes(StandardCharsets.UTF_8));
        
        String resp = new String(conn.getInputStream().readAllBytes());
        // Parse JSON to get result.id (the CF custom hostname ID)
        // Use Jackson ObjectMapper here
        JsonNode root = new ObjectMapper().readTree(resp);
        return root.path("result").path("id").asText();
    }
    
    // Delete a custom hostname (removes SSL cert and routing)
    public void deleteCustomHostname(String hostnameId) throws Exception {
        String url = "https://api.cloudflare.com/client/v4/zones/" + zoneId 
            + "/custom_hostnames/" + hostnameId;
        
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("DELETE");
        conn.setRequestProperty("Authorization", "Bearer " + apiToken);
        conn.getResponseCode(); // fire and forget
    }
}
```

---

### STEP 7 — ResolveProjectService: Add Custom Domain KV Methods

Add to [ResolveProjectService.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Service/ResolveProjectService.java):

```java
// Write KV key: "resolve-custom:{domain}" → same payload as resolve:{subdomain}
public void updateCustomDomainResolve(Project project, Deployment deployment) {
    if (project.getCustomDomain() == null) return;
    
    String key = "resolve-custom:" + project.getCustomDomain();
    
    String payload = """
        {
          "projectId": "%s",
          "activeDeploymentId": "%s",
          "updatedAt": "%s"
        }
        """.formatted(
            project.getId(),
            deployment != null ? deployment.getId() : "",
            Instant.now()
        );
    
    writeKvKey(key, payload); // same HTTP call as existing updateProductionResolve method
}

// Delete KV key on domain removal
public void deleteCustomDomainResolve(String customDomain) {
    String key = "resolve-custom:" + customDomain;
    deleteKvKey(key); // same as existing deleteProjectKvEntry pattern
}
```

Also update [updateProductionResolve()](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Service/ResolveProjectService.java#42-85) — when the active production deployment changes, we need to **also update the custom domain KV**:

```java
public void updateProductionResolve(Project project, Deployment deployment) {
    // ... existing code for resolve:{subdomain} ...
    
    // NEW: also update custom domain KV if one is active
    if (project.getCustomDomain() != null && "ACTIVE".equals(project.getCustomDomainStatus())) {
        updateCustomDomainResolve(project, deployment);
    }
}
```

---

### STEP 8 — Cloudflare Worker Update ([index.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/cloud%20flare%20proxy/s3-proxy/src/index.js))

This is the smallest change. Add a new lookup path for custom domains **before** the subdomain logic:

```javascript
// --------------------------------------------------
// 3️⃣ Parse subdomain + deployment (EXISTING)
// OR detect custom domain (NEW)
// --------------------------------------------------
const isWarealityDomain = hostname.endsWith(".wareality.tech") || hostname === "wareality.tech";

let subdomain;
let deploymentId = null;
let info = null;
let resolveSource = "KV";

if (isWarealityDomain) {
  // ── EXISTING LOGIC (unchanged) ──────────────────
  const hostPart = hostname.split(".")[0];
  
  if (hostPart.includes("--")) {
    [deploymentId, subdomain] = hostPart.split("--", 2);
  } else {
    subdomain = hostPart;
  }
  
  const kvKey = `resolve:${subdomain}`;
  const kvValue = await env.KV.get(kvKey);
  
  if (kvValue) {
    info = JSON.parse(kvValue);
    resolveSource = "KV";
  } else {
    // fallback to API (existing code)
    const apiRes = await fetch(`${env.API_RESOLVE_URL}?subdomain=${encodeURIComponent(subdomain)}`, {
      headers: { "X-Internal-Token": env.INTERNAL_PROXY_TOKEN }
    });
    if (!apiRes.ok) return notFound(`Project "${subdomain}" not found`);
    info = await apiRes.json();
    resolveSource = "API";
  }

} else {
  // ── NEW: CUSTOM DOMAIN LOOKUP ───────────────────
  const kvKey = `resolve-custom:${hostname}`;
  const kvValue = await env.KV.get(kvKey);
  
  if (kvValue) {
    info = JSON.parse(kvValue);
    resolveSource = "KV-CUSTOM";
    console.log(`[${reqId}] Custom domain resolved via KV`, info);
  } else {
    // Custom domain not found in KV — not registered or pending verification
    return notFound(`Custom domain "${hostname}" is not connected to any Pushly project. 
                     Please verify your domain in the Pushly dashboard.`);
  }
  
  subdomain = info.subdomain || hostname; // for logging
}

// -- rest of the code is UNCHANGED --
// info.projectId and info.activeDeploymentId are the same shape
```

> **That's it for the worker.** The S3 serving logic is identical — we just resolved differently.

---

### STEP 9 — Frontend UI

**Project Settings Page** — New "Custom Domain" section:

```
┌─────────────────────────────────────────────────────┐
│ 🌐 Custom Domain                                    │
│                                                      │
│ Your project URL: https://myapp.wareality.tech       │
│                                                      │
│ Add a custom domain to serve your project at         │
│ your own URL.                                        │
│                                                      │
│ [mycustomdomain.com              ] [Add Domain]      │
│                                                      │
│ ─────── After clicking Add Domain ──────────────    │
│                                                      │
│ ✅ Step 1: Add this DNS TXT record to verify:        │
│   Host:  _pushly-verify.mycustomdomain.com           │
│   Value: pushly-verify-a1b2c3d4     [Copy]          │
│                                                      │
│ ✅ Step 2: Add this CNAME record:                    │
│   Host:  mycustomdomain.com (or @)                   │
│   Value: proxy.wareality.tech       [Copy]          │
│                                                      │
│ [I've added the records — Verify Now]                │
│                                                      │
│ Status: 🟡 PENDING / 🟢 ACTIVE / 🔴 FAILED          │
└─────────────────────────────────────────────────────┘
```

**API calls from frontend:**
```typescript
// 1. Add domain
await fetch(`/api/projects/${projectId}/custom-domain`, {
  method: 'POST',
  body: JSON.stringify({ domain: 'mycustomdomain.com' })
})
// Returns: { verifyToken, txtRecord, txtValue, cnameRecord, cnameTarget }

// 2. Verify
await fetch(`/api/projects/${projectId}/custom-domain/verify`, { method: 'POST' })
// Returns: { verified: true, status: 'ACTIVE' }

// 3. Remove
await fetch(`/api/projects/${projectId}/custom-domain`, { method: 'DELETE' })
```

---

## KV Store Shape Summary

| KV Key | Value |
|---|---|
| `resolve:{subdomain}` | `{ projectId, activeDeploymentId, updatedAt }` (existing) |
| `resolve-custom:{customDomain}` | `{ projectId, activeDeploymentId, updatedAt }` (NEW) |

---

## Complete User Flow

```
1. User opens Project Settings → Custom Domain tab
2. Types "mycustomdomain.com" → clicks "Add Domain"
3. API generates verify token, saves to DB (status=PENDING)
4. Frontend shows DNS instructions:
     TXT: _pushly-verify.mycustomdomain.com → pushly-verify-a1b2c3d4
     CNAME: mycustomdomain.com → proxy.wareality.tech
5. User goes to their domain registrar (Namecheap, GoDaddy, etc.)
   and adds both records
6. User clicks "Verify Now" in dashboard
7. API does DNS-over-HTTPS lookup for TXT record
8. If found:
     a. Calls Cloudflare API → creates Custom Hostname (provisions SSL)
     b. Writes KV: resolve-custom:mycustomdomain.com → { projectId, activeDeploymentId }
     c. Sets status=ACTIVE in DB
9. Within minutes, mycustomdomain.com starts serving the app with HTTPS ✅
```

---

## What Happens on Future Deployments/Promotions?

When [updateProductionResolve()](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Service/ResolveProjectService.java#42-85) is called (on new deployment, promote, rollback), it now **also updates** the `resolve-custom:` KV key automatically. Zero extra work for the user — their custom domain always points to the current production deployment.

---

## Environment Variables to Add

| Variable | Value | Where |
|---|---|---|
| `CLOUDFLARE_ZONE_ID` | Your `wareality.tech` zone ID | Heroku api-server |
| `CLOUDFLARE_API_TOKEN` | CF token with `Custom Hostnames: Edit` permission | Heroku api-server |
| `CLOUDFLARE_ACCOUNT_ID` | Already set ✅ | Heroku api-server |
| `CLOUDFLARE_KV_NAMESPACE_ID` | Already set ✅ | Heroku api-server |

---

## Implementation Order

| # | Task | Effort | File |
|---|---|---|---|
| 1 | Enable Cloudflare for SaaS on zone (one-time dashboard setup) | 5 min | CF Dashboard |
| 2 | Add DB columns + getters/setters to [Project.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Project.java) | Low | [Project.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Project.java) |
| 3 | Add KV methods to [ResolveProjectService.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Service/ResolveProjectService.java) | Low | [ResolveProjectService.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Service/ResolveProjectService.java) |
| 4 | Create `DnsVerificationService.java` | Low | new file |
| 5 | Create `CloudflareService.java` (custom hostnames) | Medium | new file |
| 6 | Add custom domain methods to [ProjectService.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Service/ProjectService.java) | Medium | [ProjectService.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Service/ProjectService.java) |
| 7 | Add 3 endpoints to [ProjectController.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Controller/ProjectController.java) | Low | [ProjectController.java](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Controller/ProjectController.java) |
| 8 | Update Cloudflare Worker [index.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/cloud%20flare%20proxy/s3-proxy/src/index.js) | Low | [index.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/cloud%20flare%20proxy/s3-proxy/src/index.js) |
| 9 | Frontend: Custom domain settings UI | Medium | settings page |

> **Estimated total effort: 1–2 days** for a working MVP.

---

## Security Considerations

- Only verified domains (DNS TXT check passed) get a KV entry  
- Verification token is unique per project, regenerated on each `initCustomDomain` call  
- Cloudflare Custom Hostnames API requires `X-Auth-Email` or Bearer token (already have this)  
- If a user removes/changes their DNS CNAME, the site stops working naturally (CF stops routing to your Worker for that hostname)  
- On project deletion, `removeCustomDomain` is called to clean up both the Cloudflare Custom Hostname and the KV entry



---------------------------------------------------------------------------------------------------------------------------
BACKEND CHANGES PROPOSAL
---------------------------------------------------------------------------------------------------------------------------

Architecture
User's domain (mycustomdomain.com)
        │
        │  CNAME → proxy.wareality.tech
        │  TXT   → _cf-custom-hostname.domain  (ownership)
        │  TXT   → _acme-challenge.domain       (SSL/DCV)
        ▼
Cloudflare Edge (wareality.tech zone)
        │
        ▼
Cloudflare Worker
        │
        ├── *.wareality.tech  →  KV: resolve:{subdomain}
        └── custom domain     →  KV: resolve-custom:{domain}
                                          │
                                          ▓
                                     S3 / assets

Database Changes
sqlALTER TABLE projects ADD COLUMN custom_domain VARCHAR(255) UNIQUE;
ALTER TABLE projects ADD COLUMN custom_domain_status VARCHAR(20) DEFAULT 'NONE';
ALTER TABLE projects ADD COLUMN custom_domain_cf_hostname_id VARCHAR(100);
```

Status values: `NONE → VERIFYING → ACTIVE → FAILED`

No verify token column needed.

---

## API Endpoints
```
POST   /api/projects/{id}/custom-domain          ← user submits domain
GET    /api/projects/{id}/custom-domain/status   ← frontend polls this
DELETE /api/projects/{id}/custom-domain          ← user removes domain
```

---

## Process Flow

### Step 1 — User Submits Domain
```
Frontend: POST /api/projects/{id}/custom-domain
          body: { "domain": "mycustomdomain.com" }
```
```
Your API:
  1. Validate domain format
  2. Check domain not already used in DB
  3. Call Cloudflare API → POST /zones/{zone_id}/custom_hostnames
     body: {
       hostname: "mycustomdomain.com",
       custom_origin_server: "proxy.wareality.tech",
       ssl: { method: "txt", type: "dv" }
     }
  4. Poll CF until dcv_delegation_records appears (2-5 sec)
  5. Save to DB:
       custom_domain = "mycustomdomain.com"
       custom_domain_status = "VERIFYING"
       custom_domain_cf_hostname_id = "<cf id>"
  6. Return DNS instructions to frontend
Response to frontend:
json{
  "status": "VERIFYING",
  "records": [
    {
      "type": "CNAME",
      "name": "mycustomdomain.com",
      "value": "proxy.wareality.tech",
      "purpose": "Route traffic"
    },
    {
      "type": "TXT",
      "name": "_cf-custom-hostname.mycustomdomain.com",
      "value": "uuid-token-here",
      "purpose": "Ownership verification"
    },
    {
      "type": "TXT",
      "name": "_acme-challenge.mycustomdomain.com",
      "value": "uuid.dcv.cloudflare.com",
      "purpose": "SSL certificate"
    }
  ]
}
```

---

### Step 2 — User Adds DNS Records

User goes to their registrar (name.com, GoDaddy etc.) and adds all 3 records. Nothing happens on your side during this step.

---

### Step 3 — Frontend Polls Status
```
Frontend: GET /api/projects/{id}/custom-domain/status
          (polls every 10 seconds)
```
```
Your API:
  1. Fetch CF hostname status:
     GET /zones/{zone_id}/custom_hostnames/{cf_hostname_id}
  2. Check result.status and result.ssl.status
  3. If both "active":
       a. Write KV: resolve-custom:mycustomdomain.com → { projectId, activeDeploymentId }
       b. Update DB: custom_domain_status = "ACTIVE"
       c. Return { status: "ACTIVE" }
  4. If verification_errors exist:
       a. Update DB: custom_domain_status = "FAILED"
       b. Return { status: "FAILED", errors: [...] }
  5. Otherwise:
       Return { status: "VERIFYING" }
```

---

### Step 4 — Domain Goes Live
```
Browser hits: https://mycustomdomain.com
                    │
                    ▼
         Cloudflare edge receives request
                    │
                    ▼
         Worker executes:
           hostname = "mycustomdomain.com"
           isWarealityDomain = false
                    │
                    ▼
           KV lookup: resolve-custom:mycustomdomain.com
                    │
                    ▼
           { projectId, activeDeploymentId }
                    │
                    ▼
           Fetch assets from S3 → serve response ✅
```

---

### Step 5 — User Removes Domain
```
Frontend: DELETE /api/projects/{id}/custom-domain
```
```
Your API:
  1. Call CF: DELETE /zones/{zone_id}/custom_hostnames/{cf_hostname_id}
     (this also revokes the SSL cert)
  2. Delete KV: resolve-custom:mycustomdomain.com
  3. Update DB:
       custom_domain = null
       custom_domain_status = "NONE"
       custom_domain_cf_hostname_id = null
```

---

## What Happens on New Deployment
```
updateProductionResolve() is called
        │
        ├── always updates:  resolve:{subdomain}
        │
        └── if custom_domain_status == "ACTIVE":
               also updates: resolve-custom:{domain}
```

User's custom domain always stays in sync with their latest production deployment automatically.

---

## Frontend UI Flow
```
┌─────────────────────────────────────────┐
│  Custom Domain                          │
│                                         │
│  [ mycustomdomain.com ] [Connect]       │
└─────────────────────────────────────────┘
          │
          ▼ (after Connect clicked)
┌─────────────────────────────────────────┐
│  Add these DNS records at your          │
│  domain registrar:                      │
│                                         │
│  1. CNAME  @  →  proxy.wareality.tech  │
│  2. TXT  _cf-custom-hostname...  → ...  │
│  3. TXT  _acme-challenge...      → ...  │
│                                         │
│  Status: 🟡 Verifying...                │
│  (auto-refreshes every 10 seconds)      │
└─────────────────────────────────────────┘
          │
          ▼ (once CF validates)
┌─────────────────────────────────────────┐
│  ✅ mycustomdomain.com is live!         │
│                                         │
│  Your project is now accessible at      │
│  https://mycustomdomain.com             │
│                              [Remove]   │
└─────────────────────────────────────────┘

Files to Create/Modify
FileActionWhat changesProject.javaModifyAdd 3 new columnsCloudflareService.javaCreatecreateCustomHostname, getStatus, deleteProjectService.javaModifyinitCustomDomain, getStatus, removeCustomDomainProjectController.javaModify3 new endpointsResolveProjectService.javaModifyupdateCustomDomainResolve, deleteCustomDomainResolveindex.js (Worker)ModifyCustom domain KV lookup branchFrontend settings pageModifyCustom domain UI section
DnsVerificationService.java — not needed at all.





---------------------------------------------------------------------------------------------------------------------------
FRONTEND CHANGES PROPOSAL
---------------------------------------------------------------------------------------------------------------------------



Overall UX Philosophy
Simple entry → Clear instructions → Transparent status → Instant feedback
The user should never feel lost. Every state has a clear message, visual indicator, and next action.

State Machine (UI States)
NONE → SUBMITTING → VERIFYING → ACTIVE → FAILED
                                       ↑
                              REMOVING ┘

State 1 — NONE (No domain connected)
┌─────────────────────────────────────────────────────────────┐
│  🌐  Custom Domain                                          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Connect your own domain to this project.                   │
│  Your project is currently accessible at:                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │  https://myapp.wareality.tech   📋  │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌───────────────────────────────────┐  ┌───────────────┐  │
│  │  mycustomdomain.com               │  │  Connect  →   │  │
│  └───────────────────────────────────┘  └───────────────┘  │
│  Enter your domain without https://                         │
│                                                             │
│  ℹ️  Works with any domain registrar —                      │
│     GoDaddy, Namecheap, name.com, Cloudflare, etc.         │
└─────────────────────────────────────────────────────────────┘
Validation on input:

Strip https:// and www. automatically
Show error inline if invalid format
Disable Connect button until valid domain entered


State 2 — SUBMITTING (API call in progress)
┌─────────────────────────────────────────────────────────────┐
│  🌐  Custom Domain                                          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⏳  Setting up mycustomdomain.com...                       │
│     Generating your DNS records                             │
│                                                             │
│  ████████████░░░░░░░░  60%                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

State 3 — VERIFYING (DNS records shown, waiting for user + CF)
This is the most important state. User needs to understand exactly what to do.
┌─────────────────────────────────────────────────────────────┐
│  🌐  Custom Domain — mycustomdomain.com                     │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🟡  Waiting for DNS verification                           │
│                                                             │
│  Add these 3 records to your DNS provider.                  │
│  Once added, verification happens automatically             │
│  (usually within 5–15 minutes).                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Record 1 of 3 — Route Traffic          ✅ Required  │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Type    CNAME                                       │   │
│  │  Name    @  (or your subdomain e.g. "app")           │   │
│  │  Value   proxy.wareality.tech              📋 Copy  │   │
│  │                                                      │   │
│  │  ℹ️  This routes traffic from your domain to         │   │
│  │     our servers                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Record 2 of 3 — Ownership Proof        ✅ Required  │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Type    TXT                                         │   │
│  │  Name    _cf-custom-hostname.mycustom...   📋 Copy  │   │
│  │  Value   bf3b3f4d-bb9c-43ed-a289...         📋 Copy │   │
│  │                                                      │   │
│  │  ℹ️  Proves you own this domain                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Record 3 of 3 — SSL Certificate        ✅ Required  │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Type    TXT                                         │   │
│  │  Name    _acme-challenge.mycustomdoma...   📋 Copy  │   │
│  │  Value   XAnmRUq31MBWgrEAa0ytgEZpzny...   📋 Copy  │   │
│  │                                                      │   │
│  │  ℹ️  Required for HTTPS / SSL certificate            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⏳  Auto-checking every 15 seconds...    Last check: now   │
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────┐   │
│  │  📋 Copy all records     │  │  ✕ Remove domain      │   │
│  └──────────────────────────┘  └──────────────────────┘   │
│                                                             │
│  Need help? View setup guide for →                         │
│  [name.com] [GoDaddy] [Namecheap] [Cloudflare] [Other]    │
└─────────────────────────────────────────────────────────────┘
Behavior details:

Each record card has individual copy buttons for Name and Value
"Copy all records" copies a formatted text block of all 3
Auto-polls /status every 15 seconds silently
"Last check: X seconds ago" updates in real time
Registrar quick links open docs in new tab
Long values truncated with ... but full value in clipboard on copy


State 3b — VERIFYING with partial DNS detected
Once some records are detected but not all:
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Record 1 of 3 — Route Traffic          ✅ Detected  │   │
│  │  CNAME  @  →  proxy.wareality.tech                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Record 2 of 3 — Ownership Proof        ⏳ Pending   │   │
│  │  TXT  _cf-custom-hostname...                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Record 3 of 3 — SSL Certificate        ⏳ Pending   │   │
│  │  TXT  _acme-challenge...                             │   │
│  └─────────────────────────────────────────────────────┘   │

State 4 — ACTIVE ✅
┌─────────────────────────────────────────────────────────────┐
│  🌐  Custom Domain                                          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ✅  mycustomdomain.com is live!                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │  🔒  https://mycustomdomain.com            ↗ Visit  │   │
│  │                                                      │   │
│  │  SSL Certificate    ✅ Active  (expires Jun 2026)    │   │
│  │  DNS Status         ✅ Verified                      │   │
│  │  Origin Server      proxy.wareality.tech             │   │
│  │  Connected since    Mar 26, 2026                     │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Your project is now accessible at both:                    │
│  • https://mycustomdomain.com                               │
│  • https://myapp.wareality.tech                             │
│                                                             │
│                              ┌──────────────────────────┐  │
│                              │  🗑  Remove domain        │  │
│                              └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

State 5 — FAILED
┌─────────────────────────────────────────────────────────────┐
│  🌐  Custom Domain — mycustomdomain.com                     │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🔴  Verification failed                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⚠️  What went wrong                                 │   │
│  │                                                      │   │
│  │  DNS records were not detected within the expected   │   │
│  │  time. This is usually because:                      │   │
│  │                                                      │   │
│  │  • Records were added incorrectly                    │   │
│  │  • DNS propagation is still in progress              │   │
│  │  • Records were added to wrong domain/account        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────┐   │
│  │  🔄 Try again            │  │  ✕ Remove domain      │   │
│  └──────────────────────────┘  └──────────────────────┘   │
│                                                             │
│  "Try again" will re-check your DNS records.               │
│  Make sure all 3 records are added correctly first.        │
└─────────────────────────────────────────────────────────────┘

Remove Domain — Confirmation Modal
┌─────────────────────────────────────┐
│  Remove custom domain?              │
│  ─────────────────────────────────  │
│                                     │
│  mycustomdomain.com will no longer  │
│  serve your project.                │
│                                     │
│  • SSL certificate will be revoked  │
│  • DNS records you added will need  │
│    to be removed manually from      │
│    your registrar                   │
│  • Your wareality.tech URL will     │
│    continue working                 │
│                                     │
│  ┌──────────┐  ┌──────────────────┐ │
│  │  Cancel  │  │  Yes, remove it  │ │
│  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────┘

React Component Structure
<CustomDomainSection>
  ├── <NoDomainState>          (NONE)
  │     ├── <DomainInput>
  │     └── <ConnectButton>
  │
  ├── <SubmittingState>        (SUBMITTING)
  │     └── <ProgressBar>
  │
  ├── <VerifyingState>         (VERIFYING)
  │     ├── <StatusBanner>
  │     ├── <DnsRecordCard> × 3
  │     │     ├── record status badge
  │     │     ├── <CopyField> for Name
  │     │     └── <CopyField> for Value
  │     ├── <AutoCheckIndicator>
  │     ├── <CopyAllButton>
  │     └── <RegistrarLinks>
  │
  ├── <ActiveState>            (ACTIVE)
  │     ├── <DomainStatusCard>
  │     └── <RemoveButton>
  │
  ├── <FailedState>            (FAILED)
  │     ├── <ErrorCard>
  │     ├── <RetryButton>
  │     └── <RemoveButton>
  │
  └── <RemoveConfirmModal>

Key UX Details
Copy behavior:
User clicks 📋 → value copied → button shows "Copied ✓" for 2 seconds → reverts
Auto-polling behavior:
Status = VERIFYING → poll every 15 seconds
Status = ACTIVE/FAILED → stop polling
Page hidden (tab not active) → pause polling, resume on focus
Domain input sanitization:
javascript// Auto-clean input as user types
const cleanDomain = (input) => input
  .toLowerCase()
  .replace(/^https?:\/\//i, '')   // strip protocol
  .replace(/^www\./i, '')          // strip www
  .replace(/\/.*$/, '')            // strip path
  .trim();
```

**Inline validation:**
```
mycustomdomain.com        ✅ valid
https://example.com       → auto-cleaned to example.com
not a domain              ❌ "Please enter a valid domain"
already-connected.com     ❌ "This domain is already in use"