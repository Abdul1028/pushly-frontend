 # 🧪 Multi-Framework Build Support - Testing Guide

## Pre-Flight Check ✅

All files have been verified:
- ✅ [script.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/script.js) - Framework detection integrated, API notification added
- ✅ [framework-detector.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/framework-detector.js) - 14 frameworks supported
- ✅ [config-loader.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/config-loader.js) - Override hierarchy implemented  
- ✅ [main.sh](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/main.sh) - No changes needed, works as-is
- ✅ [Dockerfile](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/Dockerfile) - Updated with @expo/cli and @angular/cli
- ✅ [package.json](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/package.json) - All dependencies present

---

## 🐳 Docker Commands

### 1. Build the Docker Image

```bash
cd "/Users/abdul/Desktop/pushly workspace all things/build-server"

docker build -t pushly-build-server:test .
```

**Expected output**: Image built successfully with @expo/cli and @angular/cli installed.

---

### 2. Test Scenarios

## Scenario A: Auto-Detection (Vite Project)

Test with a simple Vite project that has NO `gitway.config.json`:

```bash
docker run --rm \
  -e GIT_URL="https://github.com/YOUR_USERNAME/vite-test-project.git" \
  -e GIT_REF="main" \
  -e PROJECT_ID="test-project-1" \
  -e DEPLOYMENT_ID="test-deploy-1" \
  -e ENV="STAGING" \
  -e API_URL="https://api.wareality.tech" \
  -e INTERNAL_TOKEN="your-internal-token-here" \
  pushly-build-server:test
```

**Expected behavior**:
1. ✅ Detects `vite` framework
2. ✅ Uses default commands: `npm install` + `npm run build`
3. ✅ Looks for output in `dist/` directory
4. ✅ Calls `/internal/deployments/test-deploy-1/framework-detected` with framework info

---

## Scenario B: gitway.config.json Override

Test with a project that HAS `gitway.config.json`:

**Create test repo with `gitway.config.json`**:
```json
{
  "buildCommand": "npm run build:production",
  "installCommand": "npm ci",
  "outputDirectory": "build"
}
```

```bash
docker run --rm \
  -e GIT_URL="https://github.com/YOUR_USERNAME/project-with-config.git" \
  -e GIT_REF="main" \
  -e PROJECT_ID="test-project-2" \
  -e DEPLOYMENT_ID="test-deploy-2" \
  -e ENV="STAGING" \
  -e API_URL="https://api.wareality.tech" \
  -e INTERNAL_TOKEN="your-internal-token-here" \
  pushly-build-server:test
```

**Expected behavior**:
1. ✅ Detects framework (e.g., `vite`)
2. ✅ Loads `gitway.config.json`
3. ✅ Uses override commands: `npm ci` + `npm run build:production`
4. ✅ Looks for output in `build/` directory
5. ✅ Logs show: `📍 Source: gitway.config.json`

---

## Scenario C: UI Override (Highest Priority)

Test UI input overrides (mimicking frontend form input):

```bash
docker run --rm \
  -e GIT_URL="https://github.com/YOUR_USERNAME/vite-test-project.git" \
  -e GIT_REF="main" \
  -e PROJECT_ID="test-project-3" \
  -e DEPLOYMENT_ID="test-deploy-3" \
  -e ENV="STAGING" \
  -e API_URL="https://api.wareality.tech" \
  -e INTERNAL_TOKEN="your-internal-token-here" \
  -e UI_BUILD_COMMAND="npm run build:custom" \
  -e UI_INSTALL_COMMAND="yarn install" \
  -e UI_OUTPUT_DIR="custom-dist" \
  pushly-build-server:test
```

**Expected behavior**:
1. ✅ Detects framework
2. ✅ **Ignores** `gitway.config.json` (if present)
3. ✅ Uses UI overrides: `yarn install` + `npm run build:custom`
4. ✅ Looks for output in `custom-dist/` directory
5. ✅ Logs show: `📍 Source: UI Override`

---

## Scenario D: React Native Expo (Special Handling)

Test Expo project with lock file cleanup:

```bash
docker run --rm \
  -e GIT_URL="https://github.com/YOUR_USERNAME/expo-test-app.git" \
  -e GIT_REF="main" \
  -e PROJECT_ID="test-project-expo" \
  -e DEPLOYMENT_ID="test-deploy-expo" \
  -e ENV="STAGING" \
  -e API_URL="https://api.wareality.tech" \
  -e INTERNAL_TOKEN="your-internal-token-here" \
  pushly-build-server:test
```

**Expected behavior**:
1. ✅ Detects `expo` framework
2. ✅ Deletes [pnpm-lock.yaml](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/pnpm-lock.yaml) and `yarn.lock` if present
3. ✅ Logs: `🧹 Cleaning lock files for Expo`
4. ✅ Runs `npm ci` (clean install)
5. ✅ Runs `npx expo export:web`
6. ✅ Looks for output in `dist/` directory

---

## Scenario E: Next.js Static Export Validation

Test Next.js WITHOUT `output: 'export'` (should FAIL):

```bash
docker run --rm \
  -e GIT_URL="https://github.com/YOUR_USERNAME/nextjs-no-export.git" \
  -e GIT_REF="main" \
  -e PROJECT_ID="test-project-next" \
  -e DEPLOYMENT_ID="test-deploy-next" \
  -e ENV="STAGING" \
  -e API_URL="https://api.wareality.tech" \
  -e INTERNAL_TOKEN="your-internal-token-here" \
  pushly-build-server:test
```

**Expected behavior**:
1. ✅ Detects `nextjs` framework
2. ❌ **Build FAILS** with error message:
   ```
   ❌ Framework validation failed: Next.js static export not enabled. 
   Please add `output: 'export'` to your next.config.js file.
   ```
3. ✅ Calls `/internal/deployments/test-deploy-next/failed` with error

---

## Scenario F: Angular with angular.json Parsing

Test Angular project:

```bash
docker run --rm \
  -e GIT_URL="https://github.com/YOUR_USERNAME/angular-test-app.git" \
  -e GIT_REF="main" \
  -e PROJECT_ID="test-project-ng" \
  -e DEPLOYMENT_ID="test-deploy-ng" \
  -e ENV="STAGING" \
  -e API_URL="https://api.wareality.tech" \
  -e INTERNAL_TOKEN="your-internal-token-here" \
  pushly-build-server:test
```

**Expected behavior**:
1. ✅ Detects `angular` framework
2. ✅ Parses `angular.json` to find output directory
3. ✅ Runs `npm install` + `ng build`
4. ✅ Uses parsed output directory (e.g., `dist/my-app`)

---

## 🔍 Debugging Tips

### View Container Logs
```bash
# If container exits quickly, check logs
docker logs $(docker ps -a | grep pushly-build-server:test | awk '{print $1}' | head -1)
```

### Interactive Shell (for debugging)
```bash
docker run -it --rm \
  -e GIT_URL="https://github.com/YOUR_USERNAME/test-repo.git" \
  -e GIT_REF="main" \
  -e PROJECT_ID="debug" \
  -e DEPLOYMENT_ID="debug-1" \
  -e ENV="STAGING" \
  --entrypoint /bin/bash \
  pushly-build-server:test

# Inside container, manually run:
# ./main.sh
```

### Check Framework Detection Only
```bash
# Inside container
cd /home/app/output
node -e "
const { detectFramework } = require('../framework-detector');
const config = detectFramework('.');
console.log('Detected:', config);
"
```

### Test Configuration Loading
```bash
# Inside container
node -e "
const { resolveConfig } = require('../config-loader');
const { detectFramework } = require('../framework-detector');
const fw = detectFramework('/home/app/output');
const config = resolveConfig(fw, '/home/app/output');
console.log('Resolved:', config);
"
```

---

## 📋 Testing Checklist

### Framework Auto-Detection
- [ ] Vite project detected correctly
- [ ] React (CRA) project detected correctly
- [ ] Next.js project detected correctly
- [ ] Expo project detected correctly
- [ ] Angular project detected correctly
- [ ] Unknown framework falls back to `npm run build`

### Configuration Override Priority
- [ ] Auto-detection works (no config file, no UI env vars)
- [ ] `gitway.config.json` overrides auto-detection
- [ ] UI env vars override `gitway.config.json`
- [ ] UI env vars override auto-detection

### Framework-Specific Features  
- [ ] **Expo**: Lock files are deleted before `npm ci`
- [ ] **Next.js**: Build fails without `output: 'export'`
- [ ] **Angular**: Output directory parsed from `angular.json`

### API Integration
- [ ] `/internal/deployments/{id}/framework-detected` is called BEFORE build
- [ ] Request body includes: [framework](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Controller/Internal/InternalDeploymentController.java#95-133), `buildCommand`, `installCommand`, `outputDirectory`
- [ ] `/internal/deployments/{id}/complete` is called on success
- [ ] `/internal/deployments/{id}/failed` is called on failure

### Build Logs
- [ ] Framework detection logged: `📦 Detected: vite`
- [ ] Configuration resolution logged with source indicator
- [ ] Build commands logged before execution
- [ ] Output directory verification logged

---

## 🎯 Quick Test Repos

Create these simple test repositories on GitHub:

### 1. Vite Test Project
```bash
npm create vite@latest my-vite-app -- --template vanilla
cd my-vite-app
git init && git add . && git commit -m "init"
# Push to GitHub
```

### 2. Vite + gitway.config.json
```bash
npm create vite@latest my-vite-config -- --template vanilla
cd my-vite-config
cat > gitway.config.json << 'EOF'
{
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "outputDirectory": "dist"
}
EOF
git init && git add . &&git commit -m "init with config"
# Push to GitHub
```

### 3. Expo Test (if you have expo installed)
```bash
npx create-expo-app my-expo-app --template blank
cd my-expo-app
git init && git add . && git commit -m "init"
# Push to GitHub
```

---

## 🐛 Common Issues & Solutions

### Issue: "package.json not found"
**Solution**: Make sure the repo root has [package.json](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/package.json), or check if project is in a subdirectory.

### Issue: Build fails with "command not found: ng"
**Solution**: Verify `@angular/cli` was installed globally in Dockerfile (already done).

### Issue: Expo build fails
**Solution**: 
1. Check if `expo` is in dependencies
2. Verify `@expo/cli` is installed globally
3. Ensure `app.json` exists with expo configuration

### Issue: Next.js validation always fails
**Solution**: Make sure `next.config.js` or `next.config.mjs` exists with:
```javascript
module.exports = {
  output: 'export',
  // ... other config
}
```

### Issue: API endpoints not being called
**Solution**: 
1. Verify `API_URL`, `DEPLOYMENT_ID`, and `INTERNAL_TOKEN` env vars are set
2. Check network connectivity from container
3. Review logs for API call responses

---

## 📊 Expected Log Output Example

```
🔑 INTERNAL_TOKEN available: YES
🌐 API_URL: https://api.wareality.tech
Build Started... (ENV: STAGING)
🔍 Detecting framework...
📦 Detected: vite
🔎 Notifying API of detected framework: vite
✅ Framework detection saved to API

🔧 Build Configuration Resolution:
  Framework: vite
  Install Command: npm install
  Build Command: npm run build
  Output Directory: dist
  📍 Source: Auto-detected

📥 Installing dependencies: npm install
🔨 Building project: npm run build
...
Build Complete
✅ Notified API: Deployment SUCCESS
🎉 Deployment Successful!
```

---

## ✅ Ready to Test!

Start with **Scenario A** (simple Vite auto-detection) to verify basic functionality, then move to the more complex scenarios.
