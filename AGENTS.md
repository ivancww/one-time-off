# AVA One-Time-Off — Autonomous Codex Development Contract

## Mission
Build this **independent** repo into a production-ready single-premium sales app using 5pay-saving-plan as **sales UX reference**, not its recurring-pay calculation code. Use latest merged `ivancww/avaplatform` Mother Rules as sole governing baseline; verify revision before work. No Gemini review.

## Working loop
1. Read main, open PR #1, new changes, official data contract, current Mother Standard and 5Pay reference.
2. Work only on existing PR #1 branch `codex/phase1-one-time-saving`. Small commits and auditable status updates. No second competing PR.
3. Implement one checkpoint at a time; run tests and browser screenshot QA, self-review failures, repair, repeat. Do not claim PASS without evidence.
4. Do not merge, deploy, or alter the Mother repo, other App repos, live Sheet/GAS/Firebase, secrets, or official product data.
5. If the data source or product provisions are insufficient, mark the feature BLOCKED with exact missing inputs. Never invent payout schedules, guarantees or fees.
6. After all verified gates pass, leave PR in review status and send Product Owner a concise final checklist. Human approval remains mandatory for merge/deploy.

## Product information and calculation boundaries
- Source: https://docs.google.com/spreadsheets/d/1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U/edit
- Exact tabs: `1year 4%`, `3year 5%`, `5year 6%`, `自動滾存`.
- Columns: 保單年度, 每年提取百分比, 結餘倍數.
- Official *remaining balance projection* = one-time deposit × exact-year multiplier. No interpolation/extrapolation or generic CAGR substitution.
- The payout start year, payout basis, withdrawal amounts, cumulative cash paid, guarantees, charges and surrender conditions are **not established** solely by the spreadsheet. Keep explicit hold until verified, and label product terms clearly.
- Replace prototype manual snapshot with authenticated, versioned and cached official-data adapter only after verifying permitted Google Sheets/GAS integration; never bundle private credentials client-side or mutate production Sheet.

## Sales flow
P1 needs → P2 one-time amount → P3 bank scenario (assumption, not live yield) → P4 withdraw vs accumulation → P5 year projection → P6 valid comparison including withdrawals only when supported → P7 decisions and PDF summary. Preserve visited-page/back behavior, money grouping in input, coherent single-screen navigation and clear source labels.

## Mother Standard integration
- Independent repo/deployment/version; frontend/user/admin separately scoped. Central AVA access and direct-link authentication policy; never fake auth based on URL flags alone.
- Official product facts protected; User owns presentation content only. Latest approved inline User Edit (edit sales-flow screens, optional add/remove/edit where permitted, batch Save Local, no redundant preview). IndexedDB local-first; import/export compatibility; no private customer data in repo.
- Accessibility, mobile/desktop, tablet and iPad portrait/landscape; HONOR Magic V5 unfolded iPad layout parity, folded handset, PWA and WebView. No global overflow masking; explicit QA matrices.
- Version-safe caching and auto-update of App shell. Offline and source-failure indicators; no stale values silently presented as live.

## Merge gate checklist
- [ ] Official-data adapter verified; source/version/schema validation + offline behavior
- [ ] Product terms reviewed, displayed accurately; no misleading total-return comparison
- [ ] Full frontend/user/admin boundary + Unified User Edit
- [ ] Browser UI screenshots and interaction QA, inclusive of responsive matrix
- [ ] Unit/integration regression tests, edge cases, a11y and security checks
- [ ] Latest AVA Mother Standard reviewed and documented
- [ ] User-visible changelog, backup/restore and manual QA instructions
- [ ] Product Owner final approval (no automatic merge/deploy)

## Reporting
Use PR #1 description/checklists and commit comments for visible status. CI is a deterministic test gate, **not** proof an always-on AI coding worker is connected. A separate authorized Codex runner with appropriate GitHub credentials and controlled compute must actually execute the coding loop. Never claim autonomous development has started until that runner is verified.
