# 04 · Styling Architecture

`src/App.css` is **2,627 lines** in one global file. The fundamentals are fine (strict BEM,
276 token refs, only 4 legit `!important`); the problem is **override-by-append**: lines
1–2001 are a clean by-feature stylesheet, and lines ~2002–2419 are appended "phases" that
**re-declare earlier selectors** instead of editing them. Every duplicate lives in that
second half.

## Section map of `App.css`

Sections 1–22 are the original by-feature layout; 23–29 are the appended override phases.

| Section | Lines | Key selectors |
|---------|-------|---------------|
| App shell / layout | 1–29 | `.app`, `.app__main` |
| Top bar | 31–177 | `.topbar*`, `.topbar__menu/btn/center/difficulty/timer/status/lives/mistakes` |
| Board | 179–223 | `.board`, `.board__ghosts`, `.board__ghost*` |
| Radial mode picker | 225–271 | `.radial`, `.radial__hub/opt/label` |
| Cells + cell animations | 273–495 | `.cell`, `.cell--*`, `.cell--flash/pop`, keyframes, `.cell__value/notes/note` |
| Number pad (**base**) | 497–533 | `.numberpad`, `.numberpad__key/digit/count` |
| Controls (**base**) | 535–565 | `.controls`, `.control`, `.control--active` |
| Hint banner | 567–604 | `.hint-banner*` |
| Win/lose overlay | 606–696 | `.overlay*`, keyframe `pop` |
| Confirm modal | 698–757 | `.modal*` |
| New-game sheet | 759–841 | `.sheet-backdrop`, `.sheet*` |
| Reload toast | 843–873 | `.reload-toast*` |
| Screens & nav frame | 875–946 | `.screen*`, `.screen-header*` |
| Home | 948–1190 | `.home*`, `.spinner` |
| Difficulty picker | 1192–1264 | `.difflist`, `.diffcard*` |
| Challenges | 1266–1401 | `.chal-*` |
| Suspense loader + transition | 1403–1435 | `.screen-loading`, `.screen-anim` |
| Learn index | 1437–1504 | `.learn-*` |
| Lesson detail + board | 1506–1624 | `.lesson-*`, `.lboard*` |
| Interactive walkthrough | 1626–1735 | `.walk__*`, `.lesson-actions*` |
| Statistics | 1737–1897 | `.stat-*` |
| Settings | 1899–2000 | `.settings-*`, `.theme-*`, `.setting-row*`, `.switch*` |
| **Phase B** (notes, mode bar, bigger pad) | **2002–2118** | `.board`⟳, `.mode-bar*` (1st), `.numberpad*`⟳ (2nd) |
| **Phase C** (arcade score) | 2120–2142 | `.overlay__score*` |
| Global reduced-motion | 2144–2154 | `*` |
| **Phase I** (docked tray) | **2156–2219** | `.app__pad`⟳, `.numberpad*`⟳ (3rd), `@media(max-height:760px)` |
| Tray spacing + mode colour | **2221–2318** | `.mode-bar__btn`⟳, `.control`⟳, `.app[data-mode]`, banned/locked keys |
| Input-tray flex layout | **2320–2419** | `.pad-row`, `.mode-bar`⟳, `.numberpad*`⟳ (4th), `.controls`/`.control`⟳ |
| How-to-play tutorial | 2421–2638 | `.learn-howto*`, `.tut-*` |

(⟳ = re-declares an earlier selector.)

**Cross-cutting selectors that must stay global** (not colocated): `.app`, `.app__main`,
`.app__pad`, `.pad-row`, `.screen*`, `.screen-anim`, `.spinner`, the 9 `@keyframes`, the
global reduced-motion block, and the `.board,.numberpad,.controls *` user-select guard
(2015–2024).

## Duplicate / override inventory

Every selector defined more than once. All share the **same specificity** (single class ±
pseudo), so cascade is pure source-order → last-wins-per-property → **safe to collapse**.

| Selector | Line numbers | # |
|----------|-------------|---|
| `.numberpad` | 498, 2102, 2178, 2375 | **4** |
| `.numberpad__key` | 504, 2105, 2182, 2383 | **4** |
| `.numberpad__digit` | 523, 2111, 2197, 2393 | **4** |
| `.numberpad__count` | 527, 2115, 2202, 2399 | **4** |
| `.numberpad__key:active:not(:disabled)` | 517, 2192 | 2 |
| `.mode-bar__btn` | 2070, 2222, 2345 | **3** |
| `.control` | 542, 2226, 2410 | **3** |
| `.mode-bar` | 2065, 2338 | 2 |
| `.mode-bar__btn--active` | 2087, 2249 | 2 |
| `.controls` | 536, 2407 | 2 |
| `.board` | 180, 2007 | 2 |
| `.app` | 2, 2235 | 2 |
| `.app__pad` | 2058, 2162 | 2 |

**Traps to know:** `.mode-bar` flips `display:grid`→`flex`, so the `grid-template-columns`
in the earlier block does nothing. `.numberpad__key` sets `aspect-ratio` three times and
`height:clamp(...)` @2182 is killed by `height:100%` @2383. `.mode-bar__btn--active` @2087 is
**entirely** overridden by @2249 — delete it. A Claude session that edits the wrong (dead)
block will see no visual change — this is exactly why the file must be deduped.

## Token audit

- **8 themes** (`system` + 7 explicit), **~24 tokens each**. Default (light) tokens live in
  `index.css` `:root` + a `prefers-color-scheme:dark` block; `themes.css` re-defines the full
  set 7 more times under `:root[data-theme="…"]`. `themes.ts` holds only the registry
  (id/label/swatch) — **the real values are duplicated into CSS**, and the light values exist
  in two identical copies.
- **Dead tokens:** `--note` (defined in all 8 themes, used 0×), `--radius` (`index.css:36`,
  used 0×).
- **Phantom tokens:** `--correct` / `--danger` are *referenced with fallbacks*
  (`App.css:1579`, `:1598`) but **never defined** — they always resolve to the hardcoded
  fallback (looks theme-aware, isn't).
- **Hardcoded note-violet `#7c5cff`** — the worst offender: 5× in `App.css`
  (2029, 2239, 2258, 2275, 2286) **and** 2× as a JS string in `Tutorial.tsx:75,79`. Not
  theme-aware, duplicated across the CSS/JS boundary. `--note` should simply *be* this violet.

## Target structure (recommended)

Three options were weighed:

- **(a) Per-component global CSS files, colocated + imported by each `.tsx`** — ✅ recommended
  target. BEM prefixes already map 1:1 to components (`numberpad__*` → `NumberPad.css`), so
  the split needs **no `className` edits** (screenshot-verifiable), and it gives Claude a
  small file per change.
- **(b) CSS Modules** — ❌ rejected. Requires rewriting every `className` across 27 files for
  collision-safety that BEM already provides, and fights the cross-component `.app[data-mode]
  .numberpad__key` selectors.
- **(c) One reorganized + deduped file** — ✅ do this **first** as a prerequisite (you can't
  cleanly split a file that defines `.numberpad` 4×), but it doesn't fix the haystack.

**React Native note:** RN discards all three CSS options equally — so don't over-invest in
CSS scoping. The value that survives the port is the **token map**: extract theme values into
`src/theme/tokens.ts` (a typed `Record<ThemeId, Record<TokenName, string>>`) as the single
source of truth, and generate `themes.css` from it (like `scripts/generate-icons.mjs`). RN
then reads the same object into `StyleSheet.create`.

**Proposed layout:**
```
src/theme/tokens.ts        # SOURCE OF TRUTH for theme values (RN-ready)
src/theme/themes.css       # GENERATED from tokens.ts (do not hand-edit)
src/styles/base.css        # reset, html/body, ::selection, user-select guard
src/styles/shell.css       # .app, .app__pad, .pad-row, .screen*, .spinner, @keyframes, reduced-motion
src/components/<Name>.css  # colocated, imported by <Name>.tsx
src/screens/<Name>.css     # colocated
```

Migration steps and the CLAUDE.md convention to document are in
[Phase 3](phases/phase-3-styling-consolidation.md).
