# One-Time-Off — Canonical AVA UI redesign acceptance contract

Status: **implementation pending**. This document is the Product Owner's approved scope for the next UI-only PR, not evidence that the visual changes have already been implemented.

## Authority and scope
- Source of truth: `ivancww/avaplatform` current `docs/MOTHER-RULES.md`, `design-system/DESIGN-SYSTEM.md`, and canonical `tokens.css`, `components.css`, `frontend.css`.
- Existing independent Apps may inform the *placement and interaction pattern* for sales-flow **「返回」/「下一步」** only; they do not supersede the canonical Design System.
- Retain the independent `one-time-off` repository, seven-page flow, four plans, original 60 source rows and exact-year calculations.
- No changes to official Sheet, GAS, backend, Admin, Platform PR #80, deployed hosting or authorization.

## Visual behavior
1. Replace prototype-specific palettes, sizing and shell/card styles with canonical AVA semantic tokens and Frontstage components. No separate One-Time-Off visual system.
2. Remove **visible** persistent top seven-step tabs. Maintain seven sales pages and custom-page ordering in User Edit; do not keep inaccessible hidden page buttons as an alternative navigation implementation.
3. Use the existing AVA independent-app guided navigation convention with **「返回」** and **「下一步」** positioned and styled to match approved sales flow; clearly distinguish **「返回 AVA」** from within-flow Back. First-page and final-page behavior must be deliberate and consistent.
4. If progress is shown, use compact current-page progress without turning it into a seven-tab table of contents.
5. Preserve the customer's focused sales presentation and the in-place User Edit → Preview → Save Local behavior, backup/restore and IndexedDB migration compatibility.
6. HONOR Magic V5 unfolded must preserve iPad-equivalent content hierarchy and single-line important values where feasible without clipping, while folded layout remains usable.

## Change implementation checklist
- [ ] Inspect canonical Platform classes, tokens and asset-loading patterns, and inspect the existing app sales-flow Back/Next placement before modifying markup.
- [ ] Implement canonical styling locally and update static artifact allowlist and Service Worker shell assets consistently.
- [ ] Remove `.steps` top tab rendering from `src/main.js` and replace navigation behavior without losing custom User pages.
- [ ] Update browser tests still relying on `[data-page]` navigation to exercise real Back/Next and User Edit page access. Prevent stale tests from passing via hidden tabs.
- [ ] Verify P1–P7, four-plan math, exact-year balances, user custom pages, backup restore, source/cached/snapshot diagnostics, export/import, entry modes and Return to AVA.
- [ ] Browser screenshots for P1, P2, P4, P5, P6, P7 and User Edit/Preview at iPad portrait/landscape, HONOR unfolded/folded, PWA simulations.
- [ ] Run canonical Design System validation, Quality Gate, Browser QA and static release tests; label physical device checks NOT TESTED until performed.

## Release and PR gates
- Same focused Draft PR until implementation and QA pass.
- Platform PR #80 must stay unchanged and unmerged until the redesigned app is deployed and real Front/User URLs have been verified.
- No merge or deployment without the Product Owner's explicit final approval.
