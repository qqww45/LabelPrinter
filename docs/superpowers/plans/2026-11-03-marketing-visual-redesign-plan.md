# Marketing Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the marketing shell (`/`, `/templates`, `/help`, site header/footer) to a SaaS landing feel with real in-situ label photos while keeping brand blue and `/app` unchanged.

**Architecture:** Add `public/marketing/*.webp` assets plus a small `marketingAssets.js` map. Introduce `MarketingImage.vue` for lazy-loaded covers. Rework Home/Templates/Help layout CSS for wider sections and photography-first cards; keep vector `TemplatePreviewThumb` only for the templates detail pane.

**Tech Stack:** Vue 3, existing site CSS tokens, static WebP under `public/`, Vitest/Node tests already in repo.

## Global Constraints

- Keep existing `--primary` blue; do not rebrand hue.
- Edge-only deploy; assets live under `public/marketing/`.
- Do not change routes, default landing algorithm, or `/app` editor behavior.
- Respect `prefers-reduced-motion`.
- Footer「首页」must still open marketing home (`/?home=1` or existing site helper).
- Chinese UI strings via existing `t()`.
- `docs/` may be gitignored — force-add docs under `docs/superpowers/` when committing specs/plans.

---

### Task 1: Asset map module + failing test

**Files:**
- Create: `src/content/marketingAssets.js`
- Create: `tests/marketingAssets.test.mjs`
- Create: `public/marketing/.gitkeep` (images filled in Task 2)

**Interfaces:**
- Produces: `resolveMarketingAsset(kind, id?)` returning `{ src, alt }` with fallbacks; exports `HERO`, `STEPS`, `SCENES`, `TEMPLATE_COVERS`, `HELP_BAND`.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { resolveMarketingAsset, HERO, SCENES } from '../src/content/marketingAssets.js'

assert.ok(HERO.src.includes('/marketing/'))
assert.ok(resolveMarketingAsset('scene', 'express').src.includes('marketing'))
assert.ok(resolveMarketingAsset('template', 'missing_id').src)
assert.ok(Object.keys(SCENES).length >= 4)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/marketingAssets.test.mjs` or `npm test`
Expected: FAIL module missing

- [ ] **Step 3: Minimal `marketingAssets.js`**

Implement maps keyed by scene ids from `SCENE_PACKS` and builtin template ids used on home/templates. Paths like `/marketing/hero-shelf-price.webp`. `resolveMarketingAsset('template', id)` → template cover → scene default → hero.

- [ ] **Step 4: Re-run test — PASS**

- [ ] **Step 5: Commit** `test: add marketingAssets map`

---

### Task 2: Generate and commit marketing WebP set

**Files under `public/marketing/`:**
- `hero-shelf-price.webp`
- `step-pick.webp`, `step-import.webp`, `step-print.webp`
- `scene-retail.webp`, `scene-express.webp`, `scene-asset.webp`, `scene-warehouse.webp`, `scene-jewelry.webp`, `scene-apparel.webp`
- `help-band.webp`
- Optional sparse `cover-*.webp`; reuse scene images when sparse

**Requirements:** In-situ stickers (shelf price tag, parcel waybill, asset plate, bin label). No big text overlays. Consistent cool commercial lighting. Prefer WebP under ~300KB each when possible.

- [ ] Generate or use attached uploads; place files; align filenames in `marketingAssets.js`
- [ ] Commit `assets: marketing in-situ label photos`

---

### Task 3: `MarketingImage.vue`

**Files:**
- Create: `src/components/site/MarketingImage.vue`

**Interfaces:**
- Props: `src`, `alt`, `aspect` (optional), `priority` (skip lazy for Hero)

- [ ] Implement rounded cover image with lazy loading unless priority
- [ ] Commit `feat: MarketingImage component`

---

### Task 4: Site shell CSS + header/footer polish

**Files:**
- Modify: `src/styles/site.css`
- Modify: `src/components/site/SiteHeader.vue`, `SiteFooter.vue`

- [ ] Widen `.site-main` to ~1160px; increase section spacing; photo-card utilities
- [ ] Header glass/blur + border; mobile nav exposes all marketing links + workbench CTA
- [ ] Footer home → marketing home
- [ ] Commit `style: marketing shell layout tokens`

---

### Task 5: HomeView photography-first layout

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] Hero uses `MarketingImage` + HERO asset (optional size chip)
- [ ] Steps use STEP images; scenes use SCENES photos
- [ ] Enter animation respects reduced motion
- [ ] Commit `feat: home marketing photography layout`

---

### Task 6: TemplatesView photo covers + vector detail

**Files:**
- Modify: `src/views/TemplatesView.vue`

- [ ] Card covers via `resolveMarketingAsset('template', id)`
- [ ] Selected detail pane keeps `TemplatePreviewThumb`
- [ ] Commit `feat: template library photo covers`

---

### Task 7: HelpView band + reading rhythm

**Files:**
- Modify: `src/views/HelpView.vue`

- [ ] Top band uses HELP_BAND; spacing only; keep hash TOC
- [ ] Commit `feat: help marketing band`

---

### Task 8: Verify + PR

- [ ] `npm test` and `npm run build` green
- [ ] Open PR `feat: marketing shell photography and SaaS layout` (do not merge)

## Spec coverage

| Spec item | Task |
|-----------|------|
| SaaS layout + blue retained | 4, 5 |
| In-situ photos | 2, 5–7 |
| Template covers photo / detail vector | 6 |
| Help band | 7 |
| Header/footer | 4 |
| `/app` untouched | avoid EditorView |
| Assets map | 1–2 |
