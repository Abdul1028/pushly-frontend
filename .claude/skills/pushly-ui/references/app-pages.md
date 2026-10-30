# Applying Pushly UI to the app pages

The logged-in pages (`/dashboard`, `/project/[id]`, `/project/[id]/domain`, `/new`, `/logs`, `/settings`) still use the old dark shadcn look (`bg-card`, `text-muted-foreground`, raw `zinc-*`/`white/10`, `rounded-md` everything). Convert them to this system page by page. `components/landing/dashboard-shot.tsx` is the visual target: it is literally what the Pushly dashboard should look like.

## Page frame

- Light appearance by default (match the marketing site): root `<div className="appearance-light bg-fill min-h-svh text-label">`, content `mx-auto max-w-[1100px] px-4 sm:px-6 py-10`.
- Page title: `text-title text-label` (32px), optional one-line `text-[15px] text-label-2` below. No icon tiles next to titles.
- Primary page action top-right: `btn-apple` (compact variant for app chrome: `h-9 px-4 text-[14px] rounded-full bg-apple-blue text-white`).
- Logged-in nav: same `material-light` 48px bar; product name as plain wordmark (drop the scrambling `Brand` animation — it's decorative motion); active link `text-label font-medium`, others `text-label-3`.

## Surfaces

- Content groups are white panels on the `bg-fill` page: `rounded-2xl bg-white border border-black/[0.06]`, inner padding `p-5 md:p-6`, section header `text-[17px] font-semibold tracking-[-0.022em]` with an optional right-aligned `text-[13px] text-link` action.
- Lists inside panels: rows from the "Status row" recipe, `divide-y divide-black/[0.06]`.
- Forms: labels `text-[13px] font-medium text-label`, inputs `h-11 rounded-xl bg-white border border-black/10 px-3.5 text-[15px] focus-visible:ring-2 focus-visible:ring-apple-blue/40`, helper text `text-[12px] text-label-3`. Group related fields in one white panel; separate groups with space, not divider lines with labels.
- Destructive zone: plain white panel, title in `text-sys-red`, a single secondary-style destructive button — no red-tinted backgrounds.

## Page-specific direction

- **Dashboard: done** — `app/dashboard/page.tsx`: project cards (whole card links, `…` menu above it), live production status per card via `/deployments/active`, search when >3 projects.
- **Project workspace: done** — `app/project/[id]/layout.tsx` (sidebar with sliding selection pill; scrollable tab row on small screens) and sections `page.tsx` (Overview: production panel with live preview, instant rollback, staging + promote, recent deployments), `deployments/`, `env/`, `domain/`, `settings/` (save bar slides up when dirty). Shared pieces in `components/project/`: `project-context.tsx` (SWR data + actions, polls while building), `ui.tsx` (`Panel`, `PageHeader`, `StatusDot`, `EnvPill`, `btn.*`, `TextField`, `Segmented`, `ConfirmDialog`, `errorMessage`), `deployment-row.tsx`, `new-deployment.tsx`. Build new app sections from these.
- **Deploy logs:** light console panel like the highlights `LogsVisual` (`bg-[#fbfbfd]`, mono 12.5px, timestamp column in `label-3`, success lines `text-sys-green`). Status in the header as dot + word. No fake traffic lights, no emoji.
- **Custom domain:** keep the three-state flow (none → verifying → active); restyle cards as white panels, DNS records as rows with copy buttons, success as a single green check line.
- **New project:** one column, grouped white panels (Repository, Domain, Build settings, Environment), real toggle/segmented controls instead of native checkbox/radio, `btn-apple` submit that names the outcome ("Create and deploy").
- **Login/register: done** — `app/login`, `app/register` on `components/auth/auth-shell.tsx` (`AuthShell`, floating-label `Field`, `PasswordField` with show/hide, `FormError`, `SubmitButton`). Reuse these for any other auth-style form (reset password, invite accept).

## Motion in the app

Apps get less motion than marketing pages:
- Yes: press feedback, `layout` animations when rows are added/removed, status changes (Building → Ready crossfade), sheet/dialog springs that originate from their trigger, skeletons via `useDelayedFlag`.
- No: scroll-linked storytelling, pinned sections, word-by-word headlines, count-ups on data that updates live.
- Optimistic UI for small actions (rename, toggle) and undo toasts instead of confirm dialogs for reversible actions.
