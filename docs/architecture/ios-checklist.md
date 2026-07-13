# iOS On-Device Checklist

Run this after any layout, theme, or PWA change. It's the honest backstop for the
device-visual bugs that unit tests **cannot** catch (iOS-standalone `dvh`, safe-area,
short-screen sizing, dark-theme contrast) — historically ~half of what reached the owner.
See [`05-testing.md`](05-testing.md#the-device-visual-gap-be-honest).

**Device:** iPhone 14 Plus (428×926), installed as a home-screen PWA (standalone), not just
Safari — several bugs only appear in the standalone container.

## Layout
- [ ] Board is a fixed size and **does not shrink or get cut off** on a short screen.
- [ ] Entering **notes / notes-alt / bans does not grow the grid** or push content off-screen.
- [ ] **No large dead space** at the bottom of the PWA (the `--app-height`/`dvh` fix holds).
- [ ] Top bar does **not overflow** on the longest labels ("Impossible", "Difficult") with
      hearts/lives shown.
- [ ] Fixed footers (tutorial / lesson next-buttons) **stay put** regardless of content length.
- [ ] Rotate the device — layout recovers correctly.

## Theme
- [ ] **Dark theme:** the crossroad-scan / same-number highlight is clearly visible (this
      regressed twice historically).
- [ ] All 8 themes render without invisible text or low-contrast cells.

## Interaction
- [ ] **Long-press does not select text** anywhere on the board/tray in the PWA.
- [ ] Radial mode picker appears anchored to the held cell and is fully on-screen near edges.
- [ ] Drag multi-select works; tapping a cell inside a selection selects just that cell.

## PWA / offline
- [ ] With the network fully off, launching the installed PWA still loads and plays (Workbox
      precache). Test via `npm run build` + `npm run preview`, then install — the SW only runs
      in preview/prod, never `dev`.
- [ ] After a deploy, the update flow behaves as chosen (silent auto-update **or** the reload
      toast — one, not both; see Phase 0).

## Notes
- Console errors should be **0** during all of the above — the visual smoke harness
  (`scripts/visual-smoke.mjs`, Phase 1) asserts this headlessly, but confirm on device too.
