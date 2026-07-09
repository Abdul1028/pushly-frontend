# Multi-Framework Build Support Implementation Plan

Add comprehensive framework detection and customizable build configurations for React Native Expo, Flutter Web, Angular, and other popular static web frameworks.

## Configuration Override Hierarchy

The build system supports optional user overrides with the following priority (highest to lowest):

1. **UI Input Fields** - When deploying from the Gitway UI (`/new` project page), users can specify:
   - Build Command
   - Install Command
   - Output Directory
2. **`gitway.config.json`** - Optional config file in project root (overrides auto-detection)
3. **Auto-Detection** - Automatic framework detection based on project files

**gitway.config.json format:**
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "outputDirectory": "dist"
}
```

All fields are optional. If not provided, auto-detection will be used.

---

## API Server Integration

### Database Schema Changes

#### Deployment Model - New Fields

Add the following fields to the [Deployment](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Deployment.java#12-257) entity:

```java
// Framework detection & build configuration
private String detectedFramework;      // e.g., "expo", "nextjs", "angular", "vite"
private String buildCommand;           // Resolved build command
private String installCommand;         // Resolved install command  
private String outputDirectory;        // Resolved output directory
```

#### Project Model - Optional Build Config Override

Add optional build configuration fields to the [Project](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Project.java#16-224) entity for user-provided overrides:

```java
// Optional build configuration (stored from UI /new page)
private String customBuildCommand;
private String customInstallCommand;
private String customOutputDirectory;
```

### New Internal API Endpoint

#### POST /internal/deployments/{deploymentId}/framework-detected

Called by build-server **immediately after framework detection** (before build starts).

**Request Body:**
```json
{
  "framework": "expo",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "outputDirectory": "dist"
}
```

**Response:**
```json
{
  "success": true,
  "deploymentId": "staging-abc1234-123-145230"
}
```

**Purpose:**
- Stores detected framework info in the database
- Allows UI to show "Building with Expo..." in real-time
- Enables framework-specific analytics and debugging

### Updated CreateDeploymentRequest

Add optional build configuration fields (from UI):

```java
// Optional build overrides (from UI input)
private String customBuildCommand;
private String customInstallCommand;
private String customOutputDirectory;
```

---

## Framework Detection Strategy

**Detection order** (checks both `dependencies` and `devDependencies`):

---

## Proposed Changes

### Core Framework Detection Module

#### [NEW] [framework-detector.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/framework-detector.js)

Create a new module that will:
- Auto-detect frameworks by checking both `dependencies` and `devDependencies` (Vercel approach)
- Validate framework-specific requirements
- Return build configuration (install command, build command, output directory)
- Support fallback to user-provided configuration

**Frameworks to detect:**

| Framework | Detection Method | Default Build Dir | Install Cmd | Build Cmd |
|-----------|-----------------|-------------------|-------------|-----------|
| **React Native Expo** | `expo` in deps/devDeps OR `app.json` with `expo` field | `dist` | `npm ci` | `npx expo export:web` |
| **Angular** | `angular.json` OR `@angular/core` | `dist/[parsed from angular.json]` | `npm install` | `ng build` |
| **Next.js** | `next` in deps/devDeps | `out` | `npm install` | `npm run build` |
| **Vite** | `vite` in deps/devDeps | `dist` | `npm install` | `npm run build` |
| **Create React App** | `react-scripts` in deps/devDeps | `build` | `npm install` | `npm run build` |
| **Gatsby** | `gatsby` in deps/devDeps | `public` | `npm install` | `npm run build` |
| **Nuxt.js** | `nuxt` in deps/devDeps | `dist` | `npm install` | `npm run generate` |
| **Vue CLI** | `@vue/cli-service` in deps/devDeps | `dist` | `npm install` | `npm run build` |
| **Svelte** | `svelte` in deps/devDeps | `public` | `npm install` | `npm run build` |
| **SvelteKit** | `@sveltejs/kit` in deps/devDeps | `build` | `npm install` | `npm run build` |
| **Astro** | `astro` in deps/devDeps | `dist` | `npm install` | `npm run build` |
| **Remix** | `@remix-run/react` in deps/devDeps | `public/build` | `npm install` | `npm run build` |
| **SolidJS** | `solid-js` in deps/devDeps | `dist` | `npm install` | `npm run build` |
| **Qwik** | `@builder.io/qwik` in deps/devDeps | `dist` | `npm install` | `npm run build` |

> [!NOTE]
> **Flutter Web Dropped**
> 
> Flutter Web support has been removed to avoid the ~600MB Docker image size increase from the Flutter SDK.

**Special Validations & Handling:**

1. **Expo**:
   - ✅ Install `@expo/cli` globally in Docker
   - ⚠️ **Before `npm ci`**: Delete [pnpm-lock.yaml](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/pnpm-lock.yaml) and `yarn.lock` to avoid conflicts
   - ⚠️ Check Expo SDK version - reject builds with very outdated versions (optional warning)
   - Use `npm ci` for clean, reproducible installs

2. **Next.js**:
   - ⚠️ Parse `next.config.js` or `next.config.mjs` to check for `output: 'export'`
   - 🚫 If static export is NOT enabled, fail build with helpful error message
   - 💡 Suggest adding `output: 'export'` to next.config.js

3. **Angular**:
   - 📄 Parse `angular.json` to extract correct project name and output path
   - ✅ Ensure `@angular/cli` is available ([ng](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Project.java#101-104) command)
   - Build output is typically `dist/[project-name]` where project-name comes from angular.json

---

#### [NEW] [config-loader.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/config-loader.js)

Create a configuration loader that:
1. Accepts optional UI-provided config (via environment variables: `UI_BUILD_COMMAND`, `UI_INSTALL_COMMAND`, `UI_OUTPUT_DIR`)
2. Checks for `gitway.config.json` in project root
3. Falls back to auto-detected framework config
4. Validates and normalizes the final configuration

**Configuration precedence** (highest to lowest):
1. UI input (from `/new` project page - passed as env vars)
2. `gitway.config.json` file in project root
3. Auto-detected framework defaults

---

#### [MODIFY] [script.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/script.js)

**Changes needed:**

1. **Remove hardcoded framework detection** (lines 99-108) and package manager detection (lines 132-144)

2. **Import new modules**:
   ```javascript
   const { detectFramework, validateFramework } = require('./framework-detector');
   const { loadConfig } = require('./config-loader');
   ```

3. **Add framework detection notification** (after detection, before build):
   ```javascript
   // Notify API server about detected framework
   async function notifyFrameworkDetected(framework, buildCmd, installCmd, outputDir) {
     if (!DEPLOYMENT_ID || !INTERNAL_TOKEN) return;
     
     const endpoint = `${API_URL}/internal/deployments/${DEPLOYMENT_ID}/framework-detected`;
     try {
       const response = await fetch(endpoint, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'X-Internal-Token': INTERNAL_TOKEN
         },
         body: JSON.stringify({
           framework,
           buildCommand: buildCmd,
           installCommand: installCmd,
           outputDirectory: outputDir
         })
       });
       if (response.ok) {
         publishLog(`✅ Framework detected: ${framework}`);
       }
     } catch (err) {
       publishLog(`⚠️ Failed to notify framework detection: ${err.message}`);
     }
   }
   ```

4. **Add Expo lock file cleanup** (before install):
   ```javascript
   // If Expo detected, clean up conflicting lock files
   if (framework === 'expo') {
     const pnpmLock = path.join(outDirPath, 'pnpm-lock.yaml');
     const yarnLock = path.join(outDirPath, 'yarn.lock');
     if (fs.existsSync(pnpmLock)) fs.unlinkSync(pnpmLock);
     if (fs.existsSync(yarnLock)) fs.unlinkSync(yarnLock);
   }
   ```

5. **Add framework validation**:
   - For Next.js: Check `next.config.js` for `output: 'export'`
   - For Angular: Parse `angular.json` for output directory
   - For Expo: Check SDK version (optional warning for outdated versions)

6. **Update build configuration logic**:
   - Use `loadConfig()` to get final build configuration (respects UI input → gitway.config.json → auto-detection)
   
7. **Update build execution**:
   - Use resolved commands from config instead of package manager auto-detection

---

#### [MODIFY] [Dockerfile](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/Dockerfile)

**Changes needed:**

Install global npm packages for Expo and Angular:
```dockerfile
RUN npm install -g @expo/cli @angular/cli
```

This installs:
- `@expo/cli` - For React Native Expo web builds
- `@angular/cli` - For Angular projects (provides [ng](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Project.java#101-104) command)

---

### Configuration Format

#### Example: gitway.config.json (User Documentation)

```json
{
  "buildCommand": "npm run build",
  "installCommand": "pnpm install",
  "outputDirectory": "dist"
}
```

All fields are optional. If not provided, auto-detection will be used. This file should be placed in the project root.

---

## Verification Plan

### Automated Tests

1. **Test framework auto-detection** for each supported framework:
   ```bash
   # Test with Vite
   docker run -e GIT_URL=https://github.com/example/vite-app.git ...
   
   # Test with Expo (verify lock file cleanup)
   docker run -e GIT_URL=https://github.com/example/expo-app.git ...
   
   # Test with Flutter Web
   docker run -e GIT_URL=https://github.com/example/flutter-web-app.git ...
   
   # Test with Angular (verify ng CLI and output directory parsing)
   docker run -e GIT_URL=https://github.com/example/angular-app.git ...
   ```

2. **Test Next.js static export validation**:
   - ✅ Deploy a Next.js app WITH `output: 'export'` → should succeed
   - ❌ Deploy a Next.js app WITHOUT static export → should fail with helpful error

3. **Test configuration override**:
   - Add `gitway.config.json` to a test repo
   - Verify custom commands are used
   - Verify custom output directory is uploaded
   
4. **Test UI input override**:
   - Pass `UI_BUILD_COMMAND`, `UI_INSTALL_COMMAND`, `UI_OUTPUT_DIR` as env vars
   - Verify they override both gitway.config.json and auto-detection

### Manual Verification

1. **Deploy a real Expo app**:
   - Verify [pnpm-lock.yaml](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/pnpm-lock.yaml) and `yarn.lock` are deleted
   - Verify `npm ci` is used
   - Check for Expo SDK version warnings (if implemented)
   - Verify framework detection API notification is sent
   
2. **Deploy an Angular app**:
   - Verify `ng build` is used
   - Verify output directory is correctly parsed from `angular.json`
   - Verify framework detection notification shows "angular"
   
3. **Deploy a Next.js app without static export**:
   - Verify build fails with helpful error message
   - Verify suggestion to add `output: 'export'` is shown

4. **Verify framework is stored in database**:
   - Check deployment record has `detectedFramework` populated
   - Check UI shows detected framework in real-time

5. **Verify error handling** when build fails or output directory not found

---

## Implementation Order

1. ✅ **API Server Changes** (do these first!):
   - Add new fields to [Deployment](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Deployment.java#12-257) model
   - Add optional fields to [Project](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Model/Project.java#16-224) model
   - Create `InternalDeploymentController.frameworkDetected()` endpoint
   - Update [CreateDeploymentRequest](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/api-server/src/main/java/com/pushly/api_server/Dto/CreateDeploymentRequest.java#7-50) with optional build config fields

2. ✅ **Build Server Changes**:
   - Create `framework-detector.js` with all framework detection logic
   - Create `config-loader.js` for configuration resolution
   - Update [script.js](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/script.js) to use new modules and notify API server
   - Update [Dockerfile](file:///Users/abdul/Desktop/pushly%20workspace%20all%20things/build-server/Dockerfile) to include Expo CLI and Angular CLI

3. ✅ **Frontend Changes** (optional, for showing detected framework):
   - Update deployment UI to display `detectedFramework`
   - Show framework-specific build info in logs UI

4. ✅ **Testing**:
   - Test with multiple framework types
   - Verify API notifications work
   - Test configuration overrides
   - Document configuration options
