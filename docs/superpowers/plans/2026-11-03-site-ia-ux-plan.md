# Site IA / UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship bookmarkable `/`, `/templates`, `/help`, and `/app` with a full marketing home, expanded template gallery page, and feature-mapped help handbook, replacing the one-shot WelcomeGate.

**Architecture:** Add Vue Router around the existing SPA. Keep the current editor as the `/app` route view (extract from `App.vue` into `EditorView.vue`). Marketing shell pages share `SiteHeader` / `SiteFooter`. Default entry: if local projects exist and the user hits bare site entry without a deep link, go `/app`; otherwise `/`. Template library becomes a real page (not only a dialog); help is static-in-app markdown/Vue sections with anchors. Edge SPA fallback for history mode.

**Tech Stack:** Vue 3, Vite, Pinia (existing), vue-router, existing i18n `t()`, EdgeOne/static hosting for ci64.com.

## Global Constraints

- Official site remains https://ci64.com/; Edge-only deploy (no Docker self-host path).
- Do not invent features that are not already in the product; home capability strip and help chapters must map 1:1 to real UI.
- Prefer Chinese UI copy via existing `t()` / i18n tables.
- Spec source of truth: `docs/superpowers/specs/2026-11-03-site-ia-ux-design.md` (force-add under docs/ if gitignored).
- Do not merge without owner ask; open PR against `main`.
- Preserve editor behavior: import, print, preflight, scene packs, P0 expressions/copies/image/serial.

---

## File map (create / modify)

| Path | Role |
|------|------|
| `package.json` | Add `vue-router` dependency |
| `src/main.js` | `app.use(router)` |
| `src/router/index.js` | Routes + default-entry guard |
| `src/App.vue` | Thin shell: `<router-view>` only (or layout wrapper) |
| `src/views/EditorView.vue` | Current editor UI moved from App.vue |
| `src/views/HomeView.vue` | Marketing home |
| `src/views/TemplatesView.vue` | Template gallery page |
| `src/views/HelpView.vue` | Help handbook with TOC + anchors |
| `src/components/site/SiteHeader.vue` | Shared nav |
| `src/components/site/SiteFooter.vue` | Footer + beian |
| `src/components/WelcomeGate.vue` | Remove from first-run path (delete or stop mounting) |
| `src/components/Toolbar.vue` | Links to `/`, `/templates`, `/help`; template opens route |
| `src/utils/firstRun.js` / onboarding | Align with “no WelcomeGate”; keep light empty-canvas onboarding on `/app` |
| `src/utils/templatesCatalog.js` (or extend existing templates/scene packs) | Catalog metadata: scene, size, industry, preview, fields |
| `public/` or Edge config | SPA fallback `_redirects` / `vercel.json` / EdgeOne rewrite note in README if needed |
| `tests/` | Router default-entry + catalog filter smoke tests |
| Help content | Prefer `src/content/help/*.md` imported as raw, or Vue section components under `src/views/help/` |

---

### Task 1: Router scaffold + EditorView extraction

**Files:**
- Create: `src/router/index.js`
- Create: `src/views/EditorView.vue`
- Modify: `src/main.js`, `src/App.vue`, `package.json`
- Test: `tests/routerEntry.test.mjs` (or vitest/node assert on pure helpers)

**Interfaces:**
- Produces: `createAppRouter()`; routes named `home`, `templates`, `help`, `app`
- Produces: `resolveDefaultPath({ hasProjects: boolean, path: string }) -> string` pure helper for tests

- [ ] **Step 1:** Add `vue-router` dependency; implement `resolveDefaultPath` and unit test (deep links never overridden; bare `/` or empty → `/app` if hasProjects else `/`).
- [ ] **Step 2:** Move current `App.vue` template/script/style that is the editor into `EditorView.vue`; `App.vue` becomes layout + `<router-view />`.
- [ ] **Step 3:** Wire routes: `/` HomeView (stub ok), `/templates` TemplatesView (stub), `/help` HelpView (stub), `/app` EditorView.
- [ ] **Step 4:** `npm test` + `npm run build` green; commit `feat: add vue-router and extract EditorView`.

---

### Task 2: Site chrome + HomeView

**Files:**
- Create: `src/components/site/SiteHeader.vue`, `SiteFooter.vue`, `src/views/HomeView.vue`
- Modify: remove `WelcomeGate` mount from editor first-run; keep optional `OnboardingGuide` on empty canvas in EditorView only

- [ ] **Step 1:** Header links: 首页 `/`, 模板库 `/templates`, 帮助 `/help`, CTA 打开工作台 `/app`.
- [ ] **Step 2:** Home sections per spec: Hero, 3 steps, scene cards → `/templates?scene=`, capability strip → `/help#…`, trust, footer with beian.
- [ ] **Step 3:** Stop showing `WelcomeGate`; migrate any still-needed CTAs onto Home.
- [ ] **Step 4:** Build + manual smoke; commit `feat: marketing home and site chrome`.

---

### Task 3: Templates page + catalog expansion

**Files:**
- Create/extend catalog module with industry, size, scene, field list, preview asset or CSS mock
- Create: `src/views/TemplatesView.vue`
- Modify: `Toolbar.vue` / App events: `@template-library` → `router.push('/templates')` (use `?pick=1` when opened from editor)
- Reuse: `applyScenePack` / existing template apply path when user clicks 使用此模板

- [ ] **Step 1:** Define catalog entries covering retail multi-size, warehouse barcode, jewelry/apparel hangtag, logistics variants — each applyable (map to real pack/template builders; no hollow cards).
- [ ] **Step 2:** Filters: scene, size, purpose; honor `?scene=` / `?size=` query.
- [ ] **Step 3:** Detail + apply → navigate `/app` and apply pack/template + sample data.
- [ ] **Step 4:** Tests for filter helpers; commit `feat: templates gallery page and expanded catalog`.

---

### Task 4: Help handbook

**Files:**
- Create: `src/views/HelpView.vue` + chapter content for all 16 sections in the spec
- Cross-link PropertyPanel expression help → `/help#…` where a long help blob already exists

- [ ] **Step 1:** TOC + scroll-spy or simple anchor list; chapters 1–16 as specified.
- [ ] **Step 2:** Each chapter: what / where to click / example; links to `/templates` or `/app` where useful.
- [ ] **Step 3:** Ensure home capability strip IDs match help anchors.
- [ ] **Step 4:** Commit `feat: help handbook page`.

---

### Task 5: Deploy fallback + regression

- [ ] **Step 1:** Add SPA rewrite config appropriate for current host (check repo for EdgeOne/静态配置); document in README if file name is host-specific.
- [ ] **Step 2:** Browser/smoke: deep link `/help#流水号`, templates query, default entry with/without projects, editor print path still works, WelcomeGate gone.
- [ ] **Step 3:** `npm test` && `npm run build`; open PR summarizing routes and how to verify.
- [ ] **Step 4:** Do not merge.

## Spec coverage check

- Bookmarkable routes ✓ Tasks 1–4  
- Default entry B ✓ Task 1  
- Full marketing home ✓ Task 2  
- Templates single page + expand ✓ Task 3  
- Full help mapped to features ✓ Task 4  
- No hollow features ✓ Global + Task 3/4  
- Edge SPA ✓ Task 5  
