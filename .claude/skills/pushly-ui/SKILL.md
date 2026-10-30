---
name: pushly-ui
description: Pushly's design system — the Apple-style look of the redesigned landing page (Geist type scale, Apple light/dark palette, pill buttons, translucent nav, product-shot windows, spring motion and scroll animations, reduced-motion rules). Use whenever building, restyling or reviewing any Pushly page or component — landing, dashboard, project, deployments, logs, domains, settings, login/register — so every page looks and moves like one product.
---

# Pushly UI

The visual language of Pushly, extracted from the landing page (`app/page.tsx`, `components/landing/`). It is modelled on apple.com product pages: quiet surfaces, one accent colour, big tight headlines, real product shots instead of decoration, and motion that is physical, interruptible and never decorative for its own sake.

**Before writing UI, read the existing pieces you will reuse** — the tokens and utilities live in `app/globals.css`, the motion components in `components/landing/`. Reuse them; do not re-invent sizes, colours or springs inline. For the component and motion catalog see [references/components.md](references/components.md); for turning the logged-in app pages into this style see [references/app-pages.md](references/app-pages.md).

## Principles

1. **Restraint.** One accent (Apple blue). No neon, no multi-colour gradients, no glow halos, no grid backgrounds, no emoji in UI copy. Colour carries meaning (status), not decoration.
2. **Hierarchy from type, not boxes.** Big tight headline → grey sub-line → body. Prefer whitespace and type contrast over borders and cards.
3. **Show the product.** Illustrate features with crisp, realistic UI (dashboard rows, URL pills, deploy steps) — never abstract blobs, fake terminals everywhere, or stock illustrations.
4. **Two-tone headlines.** First phrase in the primary label colour, second phrase in grey: `Ship on every push.` / `Built for shipping.` **`Not for configuring.`**
5. **Motion explains.** Every animation shows a state change, a cause, or where something came from. Springs, no bounce by default, always respecting reduced motion (see Motion).
6. **Honest copy.** Short, plain sentences. Never invent stats, pricing or security claims — only state what the product actually does.

## Appearances

Pushly uses Apple's two appearances. Pick one per page; don't mix inside a section.

| | Light (default for marketing & app) | Dark (chapters, immersive moments) |
|---|---|---|
| Page bg | `bg-white`, alternate bands `bg-fill` | `bg-black` |
| Raised surface | `bg-white` on `bg-fill` (or `bg-fill` on white) | `bg-surface` / `bg-surface-2` |
| Primary text | `text-label` `#1d1d1f` | `text-ink` `#f5f5f7` |
| Secondary text | `text-label-2` `#6e6e73` | `text-ink-2` `#86868b` |
| Tertiary / muted | `text-label-3` `#86868b` | `text-ink-3` `#6e6e73` |
| Hairlines | `border-black/10`, `divide-black/[0.06]`, `border-separator` | `border-hairline` (white/10) |
| Text link | `text-link` `#0066cc` → `btn-link` | `text-apple-link` `#2997ff` → `btn-apple-link` |
| Primary button | `btn-apple` (`#0071e3`) | `btn-apple` |
| Chrome / nav | `material-light` | `material-chrome` |
| Status | `sys-green` `#34c759`, `sys-orange` `#ff9500`, `sys-red` `#ff3b30` | `apple-green` `#30d158`, `apple-orange` `#ff9f0a`, `apple-red` `#ff453a` |

- A light page needs the `appearance-light` class on its root (`<div className="appearance-light bg-white text-label">`) — `globals.css` uses `html:has(.appearance-light)` to make the document background, overscroll and scrollbars light. Used by the landing page and sign in/up.
- Status colour is only for status: green = ready/live/success, orange = building/pending, red = failed/error. Accent blue = action or progress.
- Never use the shadcn `primary`/`muted`/`accent` tokens or raw `zinc-*`/`neutral-*` on Pushly-styled pages; use the tokens above.

## Typography

**Font:** Geist everywhere (`--font-sans`, loaded in `app/layout.tsx`), Geist Mono / SF Mono for code (`font-mono`). Weights: 400 body, 500 small emphasis, 600 headings. Never 700+ for headlines.

**Scale (utilities in `globals.css`)** — tracking tightens as size grows:

| Utility | Size | Leading / tracking | Use |
|---|---|---|---|
| `text-display` | 48 → 96px | 1.0 / -0.045em | One per page: the hero headline |
| `text-headline` | 36 → 64px | 1.04 / -0.04em | Section headlines (centred or full-width) |
| `text-section` | 32 → 48px | 1.06 / -0.035em | Headlines in a half-width column |
| `text-title` | 24 → 32px | 1.1 / -0.03em | Card/tile titles, page titles in the app |
| `text-lede` | 17 → 21px | 1.45 / -0.011em | Sub-line under a headline, in `label-2` |
| `text-eyebrow` | 17px / 600 | -0.02em | Small grey label above a headline |

Fixed sizes for UI text (use these exact steps, not arbitrary ones): **28/24px** card headlines (`font-semibold tracking-[-0.03em]`), **21px** step titles, **17px** body (`leading-[1.47]`), **15px** secondary body/list items, **13px** UI rows/meta, **12px** captions/footer, **11px** tiny badges. Use `tabular-nums` for any number that changes or aligns (counters, times, versions).

Headings get `text-wrap: balance` and paragraphs `text-wrap: pretty` automatically (globals).

## Layout & spacing

- **Content width:** `mx-auto max-w-[980px] px-4 sm:px-6`. Product shots may go to `max-w-[1100px]`. Long text ≤ `max-w-[620px]`.
- **Section rhythm:** `py-24 md:py-32` (hero `pt-14 md:pt-20`, closing CTA `py-28 md:py-36`). Alternate `bg-white` and `bg-fill` bands; never two identical bands touching without reason.
- **Section anatomy:** eyebrow (`text-eyebrow text-label-2`) → headline (two-tone) → lede (`mt-5`) → content (`mt-12 md:mt-16`).
- **Grids:** `gap-5` between cards; bento uses `md:grid-cols-6` with `col-span-4/2`.
- **Nav:** 48px (`h-12`) translucent bar, `max-w-[1024px]`, links `text-xs` `label/80`, small blue `Get started` pill. It switches to dark material over dark chapters via `html[data-nav=dark]`.

## Shape & depth

- **Radii (keep it tight — not everything is a pill):** buttons/status pills `rounded-full`; small chips `rounded-md`/`rounded-lg` (8px); product windows & rows `rounded-xl` (12px); cards & tiles `rounded-2xl` (16px); large stacked cards / raised sections `rounded-3xl`. Never above 32px. `corner-shape: squircle` is applied automatically in Chromium.
- **Borders:** 1px hairlines only (`border-black/10`, `border-black/[0.08]`).
- **Shadows** are soft and low-contrast, used only on things that float:
  - product window: `shadow-[0_40px_100px_-30px_rgba(0,0,0,0.35),0_10px_30px_-10px_rgba(0,0,0,0.12)]`
  - floating chip/panel: `shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]`
  - card hover lift: `hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]`
- **Materials:** translucent chrome (`material-light`/`material-chrome`) only for things content scrolls under (nav, sheets, toasts). Never stack a light translucent surface on another.

## Components (use these, don't rebuild them)

- **Buttons:** primary `btn-apple` (44px min, pill, Apple blue, press scale 0.97). Secondary action = text link with chevron: `<a className="btn-link">Read the docs <ChevronRight className="size-4" /></a>`. Primary + link side by side: `flex flex-wrap items-center justify-center gap-x-8 gap-y-2`.
- **Status:** dot + word, never a coloured badge block: `<span className="size-2 rounded-full bg-sys-green" /> Ready`. Building gets `bg-sys-orange` (optionally `animate-ping` halo).
- **Product window:** Safari/macOS window — `#f6f6f6` toolbar `h-10/h-11`, traffic lights `#ff5f57 #febc2e #28c840` (12px), centred address pill `bg-black/[0.05] rounded-md text-[12px]`. Reference: `components/landing/dashboard-shot.tsx`. Traffic lights only on product windows, not on every card.
- **Rows / lists:** `rounded-lg border border-black/[0.08] divide-y divide-black/[0.06]`, row `px-4 py-3.5`, leading 36px initial tile `rounded-lg bg-fill`, title 14px medium, meta 12px `label-3`.
- **Cards/tiles:** `rounded-2xl bg-white p-7 md:p-8` on `bg-fill` (or `bg-fill` on white). Title = two-tone 21–24px sentence.
- **Code:** light editor panel, Xcode light colours — keys `#9b2393`, strings `#c41a16`, comments `label-3`.
- Full catalog with file paths: [references/components.md](references/components.md).

## Motion

Use `motion/react` (already installed). App-wide `MotionConfig` (in `app/providers.tsx`) sets the default transition to a critically damped spring and `reducedMotion="user"`.

**Springs**
- Default: `{ type: "spring", bounce: 0, duration: 0.4 }` (UI), `0.6–1.1` for reveals.
- Bounce (`0.15–0.35`) only for momentum or a "pop" of success (a check mark appearing).
- Blur/colour/strings can't spring — give them a tween: `transition={{ default: spring, filter: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}`.
- Eases: entrance `[0.16, 1, 0.3, 1]`; deliberate full-screen transitions `[0.76, 0, 0.24, 1]`.

**Patterns (in order of preference)**
1. Entrance on scroll: `<Reveal>` (rise 40px out of 6px blur) and `<SplitHeadline>` (words tip up out of tilt + blur).
2. Scroll-linked (`useScroll` + `useTransform`) for storytelling: lid-opening product shot, pinned sections (`sticky top-0 h-[100svh]` inside a tall section), horizontal track, stacking cards, word-by-word light-up, gradient fill.
3. Living UI: product shots change state on a timer while in view (`useInView`), e.g. Building → Ready, rows sliding in with `layout`.
4. Press feedback on every button (`active:scale-[0.97]`), hover lift ≤ 4px on cards.
5. Page transitions: `<GrowLink>` (liquid flood into the next page) for the primary CTA only.

Animate only `transform`, `opacity`, `filter`, colour. Never animate layout properties in loops. Never infinite decorative loops (no floating, pulsing glows, endless typing) — the only allowed loops are status indicators and living product shots, and they pause off-screen.

**Reduced motion — required on every animation** (use `usePrefersReducedMotion` from `hooks/`, never read `matchMedia` during render):
- Drop movement (translate, scale, rotate, zoom, parallax, horizontal tracks). Keep opacity, colour and blur-to-sharp changes — they aren't vestibular.
- **SSR pitfall (bit us three times):** the server renders the animated *start* state (blurred, offset, tilted) before it knows the preference. So the reduced branch must explicitly set neutral values (`{ scale: 1, y: 0, filter: "none" }`) or remount with `key={reduce ? "static" : "anim"}` + `initial={false}`. Omitting a key does **not** undo the server style.
- Reduced fallbacks for big pieces: pinned horizontal track → swipe carousel; zoom → fade + blur; stacking scale → dim only.
- Exception (agreed with the owner): the `GrowLink` liquid transition plays even with reduced motion, because it is short and click-initiated.

## Copy voice

- Headlines: 2–5 words, end with a period. "Push to deploy." "Undo in one click." Two-tone where there's a second thought.
- Body: one or two short sentences, second person, present tense. No hype words ("blazing", "seamless", "revolutionary").
- Name: always **Pushly** via `PRODUCT_NAME` from `lib/config.ts` — never hard-code a name.
- Only factual claims (14 frameworks, Cloudflare edge, HTTPS certificates, rollback). No invented numbers.

## Accessibility & platform

- Tap targets ≥ 44px (`min-h-11`, or an `after:` hit-area extension for small visuals).
- `viewport-fit=cover` is on; sticky/fixed chrome pads with `env(safe-area-inset-*)`.
- Every decorative/illustrative element `aria-hidden`; product shots get `role="img"` + `aria-label`.
- Focus rings: blue 2px outline, offset 3px (built into `btn-*`).

## Before you finish a page — checklist

- [ ] Only tokens from this skill (no `zinc-*`, `neutral-*`, `primary`, neon, gradients other than the CTA fill).
- [ ] Type uses the scale utilities / fixed steps; one `text-display` max.
- [ ] Radii ≤ 32px, buttons are `btn-apple` / `btn-link`.
- [ ] Every animation has a reduced-motion branch with explicit neutral values.
- [ ] No infinite decorative loops; living elements pause off-screen.
- [ ] Copy is short, two-tone where it fits, and contains no unverified claims.
- [ ] `npx tsc --noEmit` and `npx eslint <changed files>` are clean; check at phone (375px) and desktop widths.
