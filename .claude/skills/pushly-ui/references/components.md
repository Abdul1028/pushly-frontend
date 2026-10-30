# Pushly UI — component & motion catalog

Everything below already exists. Import and reuse it; extend it in place if a page needs a variant.

## Motion building blocks (`components/landing/`)

| Component | What it does | Use for | Reduced motion |
|---|---|---|---|
| `reveal.tsx` → `<Reveal delay>` | Rises 40px out of a 6px blur once, on entering view | Any block (paragraphs, cards, buttons) | Appears instantly (remount, `initial={false}`) |
| `split-headline.tsx` → `<SplitHeadline lines className>` | Words tip up out of a 3D tilt, rise out of blur, ripple across the line | Every section headline. `lines={["First.", { text: "Second.", muted: true }]}` for two-tone | Blur + fade only |
| `scroll-text.tsx` → `<ScrollText text>` | Large statement; words go from 16% to 100% opacity as it scrolls | One per page, after the hero | Same (opacity only) |
| `fill-headline.tsx` → `<FillHeadline lines>` | Headline fills left→right with the blue→indigo→violet gradient on scroll | Closing CTA only | Same (colour only) |
| `count-up.tsx` → `<CountUp value="300+">` | Counts 0→N on first view, keeps suffix | Stats | Shows final value |
| `dark-chapter.tsx` → `<DarkChapter>` | Background blends light→black→white around its children; sets `html[data-nav=dark]` so the nav turns dark | Wrapping immersive dark sections | Same (colour only) |
| `zoom-statement.tsx` | Pinned: giant word zooms from 5.5× to 1× out of blur, then line + facts fade in | One dramatic statement | Blur + fades, no zoom |
| `deploy-story.tsx` | Pinned: caption crossfades, window zooms out, build steps tick, progress bar springs with scroll | Explaining a process step by step | No zoom; steps + bar still follow scroll |
| `highlights.tsx` | Pinned horizontal track of cards driven by vertical scroll + progress bar; `PushVisual` morphs `git push` → building → live URL | Feature highlights | Swipe carousel with paddle buttons |
| `workflow-stack.tsx` | Sticky cards stack; earlier ones scale down and dim | Sequential steps (3–5) | Dim only |
| `bento.tsx` | Tile grid; tiles reveal, lift on hover, each plays one micro-animation (rows stagger, check pops, bars grow, icon spins) | Feature overviews | Transforms instant |
| `hero.tsx` | Staggered entrance; headline drifts/fades on scroll; product shot opens like a laptop lid (`rotateX 32→0`) | Page heroes | Static, opacity fade on scroll |
| `dashboard-shot.tsx` | Living product shot: Building→Ready, new activity row slides in (`layout`), toast, loops while in view | Product imagery; **also the reference for app-page styling** | Content still changes (no slide) |
| `footer-reveal.tsx` → `<FooterReveal>` | Fixed footer uncovered as the raised last section scrolls away (`clip-path` slot) | Page footers | Opacity only |
| `landing-footer.tsx` | Apple-style grey footer: disclaimer line, link columns, copyright + system status | Footer content | — |

## Shared pieces

- `components/page-morph.tsx` → `<GrowLink href to="#f5f5f7">` — liquid flood transition from the clicked button into the next page (SVG goo filter, droplets, colour shifts from Apple blue to `to`, which should be the destination's background; default = light fill). Navigation runs on a 1.25s timer, not on animation end. Provider is mounted in `app/providers.tsx`. Use only for the primary CTA into a new flow (sign up, create project).
- `components/ui/window-bar.tsx` → `<WindowBar title icon>` — dark macOS title bar (for dark windows). Light windows hand-roll the `#f6f6f6` toolbar as in `dashboard-shot.tsx`.
- `components/system-status.tsx` — status link (SWR, revalidates on focus/reconnect); light footer style.
- `components/nav.tsx` — public nav: light (`material-light`) on `/`, `/login`, `/register`; swipe-to-dismiss mobile sheet; auto-dark over `DarkChapter`.
- `components/auth/auth-shell.tsx` — sign in/up frame: `AuthShell` (centred two-tone title + panel, staggered blur rise), `Field` (Apple floating label, blue focus ring, red when `aria-invalid`), `PasswordField` (44px show/hide toggle), `FormError` (inline, animated height), `SubmitButton` (full-width `btn-apple` with spinner). Failed submits shake the panel (skipped with reduced motion).
- `hooks/usePrefersReducedMotion.ts` — hydration-safe reduced-motion flag (`useSyncExternalStore`, `false` on the server). Use this, not motion's `useReducedMotion`, whenever the value changes markup.
- `hooks/useDelayedFlag.ts` — `useDelayedFlag(loading, 300)`: show skeletons only if loading lasts >300ms.

## Recipes

**Section scaffold (light)**
```tsx
<section className="bg-white py-24 md:py-32">
  <div className="mx-auto max-w-[980px] px-4 sm:px-6">
    <Reveal><p className="text-eyebrow text-label-2">Workflow</p></Reveal>
    <SplitHeadline className="text-headline text-label mt-2" lines={["From pull request", { text: "to production.", muted: true }]} />
    <Reveal delay={0.2}><p className="text-lede text-label-2 mt-5 max-w-[600px]">One or two plain sentences.</p></Reveal>
    <div className="mt-12 md:mt-16">{/* content */}</div>
  </div>
</section>
```

**Status row**
```tsx
<div className="flex items-center gap-3 px-4 py-3.5">
  <span className="size-9 shrink-0 rounded-lg bg-fill text-[13px] font-semibold text-label grid place-items-center">S</span>
  <div className="min-w-0 flex-1">
    <p className="text-[14px] font-medium text-label truncate">storefront</p>
    <p className="text-[12px] text-label-3 truncate">storefront.pushly.app</p>
  </div>
  <span className="inline-flex items-center gap-1.5 text-[12px] text-label-2">
    <span className="size-2 rounded-full bg-sys-green" /> Ready
  </span>
</div>
```

**Pinned scroll section skeleton**
```tsx
const ref = useRef<HTMLElement>(null);
const reduce = usePrefersReducedMotion();
const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
const scale = useTransform(p, [0, 0.3], [1.2, 1]);
return (
  <section ref={ref} className="relative h-[260vh]">
    <div className="sticky top-0 h-[100svh] overflow-hidden flex items-center justify-center">
      <motion.div style={reduce ? { scale: 1 } : { scale }}>…</motion.div>
    </div>
  </section>
);
```

**Spring + blur transition**
```tsx
transition={{
  default: { type: "spring", bounce: 0, duration: 1 },
  filter: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
}}
```

## Known gotchas

- Editing `globals.css` from a script sometimes leaves the Turbopack dev server serving stale CSS; touch the file through a normal editor save and reload.
- `@theme inline` tokens are not emitted as CSS variables for Tailwind preflight — that's why `body` applies `font-sans` explicitly.
- Motion `whileInView` needs a frame loop; hidden/background tabs won't play it, so never gate navigation or essential content on an animation finishing.
- `<Reveal>` renders a `<div>` — don't put it directly inside `<ol>`/`<ul>`.
