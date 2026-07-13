# Phase 3 · Styling Consolidation

**Status:** TODO
**Risk:** low (mostly mechanical, screenshot-verified) · **Depends on:** Phase 1 (visual harness)

## Goal

Turn `App.css` from a 2,627-line override-by-append monolith into deduped, per-component,
token-driven CSS — so a scoped style change touches one small file, and theme values live in
one place (RN-ready). Full section map, duplicate inventory, and token audit in
[`04-styling.md`](../04-styling.md).

## Why it's safe

Every duplicated selector shares the **same specificity**, so cascade is pure source-order
(last-wins-per-property). Collapsing duplicates and moving rules verbatim is
byte-for-byte-identical rendering — verifiable with screenshots. The BEM prefixes already map
1:1 to components, so splitting needs **no `className` edits**.

## Steps

### 0. Baseline screenshots — **safe (do first)**
Using the Phase 1 harness, capture a baseline set at 428×926: Home, Game (seeded), each
`data-mode` on the tray, Win overlay, Settings/theme grid, Learn, a lesson walkthrough, Stats,
dark theme. Commit them. Steps 1 and 3 must produce **empty diffs** against these.

### 1. Dedupe overrides in place — **safe/mechanical (highest value)**
For each duplicated selector (see the
[inventory](../04-styling.md#duplicate--override-inventory)), replace the multiple blocks with
the single effective ruleset (the post-cascade merge) at the location of its **first**
definition, and delete the later copies (mostly lines ~2002–2419). Delete the fully-dead
`.mode-bar__btn--active` @2087. Worst offenders: `.numberpad` / `.numberpad__key` /
`.numberpad__digit` / `.numberpad__count` (4× each), `.mode-bar__btn` / `.control` (3× each).

Watch the traps: `.mode-bar` flips grid→flex (the earlier `grid-template-columns` is dead);
`.numberpad__key` `height:clamp` @2182 is dead under `height:100%` @2383; three dead
`aspect-ratio` values.

**Verify:** screenshot diff must be empty. One commit.

### 2. Single-source theme tokens — **needs care (only step that changes bytes)**
- Create `src/theme/tokens.ts`: `export const themes: Record<ThemeId, Record<TokenName,
  string>>` with values lifted verbatim from `themes.css`.
- Add the missing/renamed tokens: `--note-primary` = `#7c5cff` (and make `--note` = that
  violet, killing the dead token); define `--correct` / `--danger` for real (they're currently
  phantom fallbacks); drop or wire up `--radius`.
- Add `scripts/generate-themes.mjs` (dumb string templating, like
  `scripts/generate-icons.mjs`) that emits `themes.css` + the `index.css` token block from
  `tokens.ts`. Wire into `npm run build`.
- Replace the 5 hardcoded `#7c5cff` in `App.css` with `var(--note-primary)` and the 2 in
  `Tutorial.tsx:75,79` with an import from `tokens.ts`.

**Verify:** generated `themes.css` is textually equal to the old one except the intentional
additions; screenshot diff empty. Separate commit. Risk note: the generator is the only new
moving part — keep it trivial.

### 3. Carve out per-component CSS files — **safe/mechanical, one component at a time**
In leaf-first order, cut each component's rules from `App.css` into
`src/components/<Name>.css` (or `src/screens/<Name>.css`) and add `import './<Name>.css'` to
that `.tsx`. Suggested order: `RadialMenu` → `HintBanner` → `ReloadPrompt` → `WinOverlay` →
`BanConfirm` (modal) → `NewGameSheet` → `TopBar` → `NumberPad` → `InputModeBar` → `Controls` →
`Cell`/`Board`/`GhostLayer` → `LessonBoard` → then screens (`Stats`, `Settings`, `Learn`,
`LessonDetail`, `Tutorial`, `Home`, `Difficulties`, `Challenges`).

Move cross-cutting rules into `src/styles/base.css` (reset, `::selection`, user-select guard)
and `src/styles/shell.css` (`.app*`, `.app__pad`, `.pad-row`, `.screen*`, `.spinner`, the 9
`@keyframes`, the global reduced-motion block). **Import order matters** — in
`main.tsx`/`App.tsx` keep base → themes → shell → components so the reduced-motion block and
user-select guard stay last. `App.css` shrinks to empty; delete it and swap its import.

**Verify after each component:** screenshot diff empty. **One commit per component** (matches
the repo's small-commits convention).

### 4. Document the convention in `CLAUDE.md` — **safe**
Add a Styling subsection:
- One CSS file per component/screen, colocated and imported by it; a class's file is
  determined by its BEM prefix (`numberpad__*` → `NumberPad.css`).
- **Never re-declare a selector to override it — edit the existing block.** (The rule whose
  violation created the 4× `.numberpad` mess.)
- All colours are tokens; `src/theme/tokens.ts` is the source of truth; `themes.css` and the
  `index.css` token block are **generated** — never hand-edit them. No hex/rgba literals in
  component CSS or `.tsx`.
- Keep import order base → themes → shell → components.

## Verification

- After each step, the visual smoke diff is empty (steps 1 & 3) or explained (step 2).
- `npm run build` passes (themes generation wired in).
- App looks identical across all 8 themes and the tray modes.

## Acceptance criteria

- [ ] No selector is defined more than once; dead blocks removed.
- [ ] `src/theme/tokens.ts` is the single source; `themes.css` is generated; no hardcoded
      `#7c5cff` remains; `--correct`/`--danger` are real tokens.
- [ ] `App.css` is gone; every component/screen has a colocated `.css`; cross-cutting rules in
      `styles/base.css` + `shell.css`.
- [ ] `CLAUDE.md` documents the styling convention.

## Suggested commits

1. `refactor(css): collapse duplicate/override selector blocks (no visual change)`
2. `refactor(theme): single-source tokens in tokens.ts, generate themes.css`
3. `refactor(css): extract <Component>.css` — one per component
4. `docs: document the CSS-per-component + tokens convention in CLAUDE.md`
