# ⚡ Pushly Frontend (Vercel-like UI)

Pushly is a modern **deployment and hosting platform** inspired by **Vercel**, designed with a sleek dashboard, authentication system, and live deployment tracking.  
This document describes how to build a **Vercel-style frontend** for Pushly using the provided backend APIs and Kafka log service.

---

## 🎯 Goal

Develop a **Next.js 14 + Tailwind + ShadCN/UI** frontend that mimics **Vercel’s UI and UX** — from authentication to project management, deployments, and logs — integrated with Pushly’s backend APIs.

---

## 🧠 Tech Stack

| Category | Tech |
|-----------|------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + ShadCN/UI |
| Animations | Framer Motion |
| Icons | Lucide React |
| State Management | Zustand or React Query |
| API Client | Axios or native Fetch |
| Font | Inter (same as Vercel) |
| Theme | Dark mode (black/gray surfaces, blue accent) |

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=https://api.wareality.tech
NEXT_PUBLIC_LOG_SERVICE_URL=https://kafka-log-service-4ebd58d6138e.herokuapp.com
```

---

## 🧾 Folder & Page Structure

```
src/
 ├─ app/
 │   ├─ login/
 │   ├─ register/
 │   ├─ dashboard/
 │   ├─ new/
 │   ├─ project/[id]/
 │   ├─ deployments/
 │   ├─ logs/
 │   └─ settings/
 ├─ components/
 │   ├─ Navbar.tsx
 │   ├─ Sidebar.tsx
 │   ├─ ProjectCard.tsx
 │   ├─ DeploymentCard.tsx
 │   ├─ LogViewer.tsx
 │   ├─ ProjectForm.tsx
 │   ├─ DeploymentModal.tsx
 │   ├─ AuthForm.tsx
 │   └─ ProtectedRoute.tsx
 ├─ hooks/
 │   ├─ useAuth.ts
 │   ├─ useProjects.ts
 │   └─ useLogs.ts
 └─ lib/
     └─ api.ts
```

---

## 🔐 Authentication Pages

**Routes:**  
- `/login` → `POST /api/auth/login`  
- `/register` → `POST /api/auth/register`  
- `GET /api/auth/me` → to fetch logged-in user info  

**Design:**  
- Center-aligned card, identical to Vercel’s login/register UI  
- Dark background with accent blue button  
- On success → redirect to `/dashboard`

---

## 🏠 Dashboard (`/dashboard`)

Displays all projects owned by the user:

| Data | Source |
|------|--------|
| Projects | `GET /api/projects` |

Each project card shows:
- Name  
- Subdomain  
- Latest deployment status  
- Creation date  
- Total deployments  

Includes a “+ New Project” button linking to `/new`.

---

## 🆕 New Project Page (`/new`)

Form Fields:
- Git URL  
- Git Branch  
- Subdomain  
- Description  

**Submit →** `POST /api/projects`  
On success → redirect to `/project/:id`.

---

## 📦 Project Details (`/project/:id`)

Tabs (similar to Vercel):
- **Overview**
- **Deployments**
- **Logs**
- **Settings**

**Data Endpoints:**
| Action | Endpoint | Method |
|---------|-----------|--------|
| Get Project | `/api/projects/:id` | GET |
| New Deployment | `/api/projects/:id/deployments` | POST |
| Deploy to Env | `/api/projects/:id/deployments/:id/deploy?environment=PRODUCTION` | POST |
| Rollback | `/api/projects/:id/deployments/:id/rollback` | POST |
| Stop Deployment | `/api/projects/:id/deployments/:id/stop` | POST |

Buttons:
- “Deploy Project”
- “Rollback”
- “Stop Deployment”
- “Deploy to Production”

---

## 🚀 Deployments Page (`/deployments`)

Table like Vercel’s:
| Field | Description |
|--------|-------------|
| Commit Hash | Commit reference |
| Branch | Git branch |
| Status | QUEUED / RUNNING / SUCCESS / FAILED |
| Environment | STAGING / PRODUCTION |
| Timestamp | Deployment time |

**API:**  
- `GET /api/projects/:id/deployments`  
- `GET /api/projects/:id/deployments/environment/STAGING`  
- `GET /api/projects/:id/deployments/active`

---

## 🧾 Logs Page (`/logs`)

**Purpose:** Show real-time logs for a deployment.  
Uses a dark terminal-style UI (autoscroll, monospace font).

**Fetch from Kafka Log Service:**

```
GET https://kafka-log-service-4ebd58d6138e.herokuapp.com/logs/{project-id}/{deployment-id}
```

**Implementation Notes:**
- Use `SSE` or periodic polling (every 3–5s)
- Stream output into `<LogViewer />`
- Smooth autoscroll animation
- Copy logs option via clipboard button

Example:
```tsx
useEffect(() => {
  const fetchLogs = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_LOG_SERVICE_URL}/logs/${projectId}/${deploymentId}`);
    const data = await res.text();
    setLogs(data.split('\n'));
  };
  fetchLogs();
}, [projectId, deploymentId]);
```

---

## ⚙️ Settings Page (`/settings`)

Manage user profile, organization, and API tokens.  
Endpoints:
- `GET /api/auth/me`
- `DELETE /api/auth/logout`

---

## 💅 UI Design Guide

**Colors:**
```css
--background: #000000;
--surface: #111111;
--accent: #00AEEF;
--text: #FFFFFF;
--muted: #888888;
```

**Typography:**
- Font: Inter
- Sizes: `text-sm`, `text-base`, `text-xl`, `font-semibold`
- Rounded buttons: `rounded-2xl`
- Hover: glowing accent or underline
- Animations: Framer Motion for page transitions

---

## 🧩 Components Overview

| Component | Purpose |
|------------|----------|
| `Navbar.tsx` | Top nav bar with profile and new project button |
| `Sidebar.tsx` | Navigation (Dashboard, Projects, Deployments, Logs, Settings) |
| `ProjectCard.tsx` | Display project summary |
| `DeploymentCard.tsx` | Show each deployment’s info |
| `LogViewer.tsx` | Render deployment logs |
| `ProjectForm.tsx` | Form for new project |
| `DeploymentModal.tsx` | Modal for new deployment |
| `AuthForm.tsx` | Login/Register form |
| `ProtectedRoute.tsx` | Guarded route wrapper |

---

## 🔌 API Integration Summary

| Feature | Endpoint | Method | Component |
|----------|-----------|--------|------------|
| Register | `/api/auth/register` | POST | `AuthForm` |
| Login | `/api/auth/login` | POST | `AuthForm` |
| Get Current User | `/api/auth/me` | GET | `useAuth` |
| Create Project | `/api/projects` | POST | `ProjectForm` |
| Get Projects | `/api/projects` | GET | `Dashboard` |
| Get Project by ID | `/api/projects/:id` | GET | `ProjectDetail` |
| Update Project | `/api/projects/:id` | PUT | `ProjectSettings` |
| Delete Project | `/api/projects/:id` | DELETE | `ProjectSettings` |
| Create Deployment | `/api/projects/:id/deployments` | POST | `DeploymentModal` |
| Get Deployments | `/api/projects/:id/deployments` | GET | `DeploymentsPage` |
| Deploy to Env | `/api/projects/:id/deployments/:id/deploy` | POST | `DeploymentCard` |
| Rollback | `/api/projects/:id/deployments/:id/rollback` | POST | `DeploymentCard` |
| Stop Deployment | `/api/projects/:id/deployments/:id/stop` | POST | `DeploymentCard` |
| Logs | `https://kafka-log-service-4ebd58d6138e.herokuapp.com/logs/{project-id}/{deployment-id}` | GET | `LogViewer` |

---

## 🪄 Branding

Replace Vercel’s brand elements with Pushly:
- Name: **Pushly**
- Logo: ⚡ or minimal “P” mark
- Accent color: `#00AEEF`
- Dark minimal layout

---

## 🚀 Deliverables

✅ Fully responsive Vercel-like frontend  
✅ Integrated with Pushly backend and Kafka log service  
✅ Componentized and maintainable code  
✅ Ready to deploy on Vercel or similar platforms  

---

## 🧩 Example Prompt (for v0.dev or ChatGPT UI generation)

> “Create a full-stack Next.js 14 frontend called **Pushly** that perfectly replicates **Vercel’s dashboard UI and UX**.  
> Use Tailwind + ShadCN/UI for styling, Framer Motion for animations, and integrate with these endpoints for authentication, projects, deployments, and Kafka logs:
>  
> - Base API: `https://api.wareality.tech`  
> - Logs: `https://kafka-log-service-4ebd58d6138e.herokuapp.com/logs/{project-id}/{deployment-id}`  
>  
> Include pages: `/login`, `/register`, `/dashboard`, `/new`, `/project/[id]`, `/deployments`, `/logs`, `/settings`.  
> The UI should match Vercel in spacing, layout, typography, and component design.”

---

## 🧱 License

MIT License © 2025 Pushly Technologies
