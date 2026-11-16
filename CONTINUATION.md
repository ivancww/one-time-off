# PR #1 continuation checklist

Status: draft; **not ready for Final Review**. No merge or deployment. Baseline before this round: `449b80db65b72c4c7d5398185d3740e6f3d3f116`. Code and screenshots were tested at `4785d90e8e98f4960b382de9551d3f9492b9a1b4`; this checklist update follows that commit. The PR description records the current HEAD and its CI links (a commit cannot contain its own SHA).

- Implemented: one-time contribution × exact published-year multiplier, four arrangements, year selector, optional annual table, source status and separate official/user caches. Unsupported withdrawal amounts remain disabled. The new read-only server component maps the four Sheets tabs, validates every row, produces a content revision, and requires host-supplied caller authorization and a reader token. Browser startup and reconnect use the existing adapter, with validated cache/snapshot fallback. See `docs/OFFICIAL-READ.md`.
- Changed in this round: `server/sheets-readonly.mjs`, `src/official-data.mjs`, `src/main.js`, tests, two CI workflows, `DATA_CONTRACT.md`, `docs/OFFICIAL-READ.md`, this checklist and QA screenshots.
- Local QA: all 60 rows and simulated devices, browser source failure/cache/recovery, text-only User Edit and backups, PWA offline/update and multi-tab, source/schema/security tests. For code commit `4785d90`, [quality gate](https://github.com/ivancww/one-time-off/actions/runs/43790380917) and [browser QA](https://github.com/ivancww/one-time-off/actions/runs/43790380835) passed. This checklist-only update triggers new CI; see the PR for current HEAD results. The Sheet rows were reread on 2026-11-16 Hong Kong time and still match the snapshot.
- BLOCKED: an Owner-authorized same-origin HTTPS service, its caller authorization, viewer identity and read-only token provider; actual app-to-Sheet read and live deployment are not verified. See the exact configuration steps in `docs/OFFICIAL-READ.md`. Do not modify production Sheet or GAS.
- BLOCKED: cash-flow commencement, percentage base, frequency and timing need authoritative One-Time-Off terms. `DATA_CONTRACT.md` contains the HK$500,000 worked example. No estimated payouts, withdrawal totals or extra subtraction are enabled.
- NOT TESTED: physical iPad, HONOR Magic V5 folded/unfolded, installed PWA and WebViews; browser viewports are simulations. Complete accessibility and storage quota/failure checks and Platform integration verification before release. Admin remains unsupported.
- Mother Rules inspected at Platform main `a12beaea002df9ae13e676f890c16951d4f21b28`; this is not a Platform integration sign-off. Text-only User Edit remains the scope; historical user media and backups remain preserved.

## Source diagnostics and staging follow-up

The User Edit footer includes collapsed source diagnostics for mode, last source-read time, revision, sync result and freshness. The normal customer-facing Frontstage does not expose the panel. Browser tests exercise mocked live data, changed values, denial, invalid rows, corrupted or absent cache, recovery and retained User data; the mock HK$675,000 result is not evidence of a real Sheet change. `tools/create-staging.mjs` prepares a temporary, clearly marked build for a distinct Sheet ID and refuses the production ID. The complete staging procedure and required identity/host are in `docs/OFFICIAL-READ.md`.

**REAL SHEET READ through the app: NOT VERIFIED. PRODUCTION LIVE SYNC: NOT VERIFIED.** No approved staging endpoint or viewer credential is available; the isolated staging scenario and restoration remain unperformed. A missing well-formed year cannot be distinguished from a legitimate source deletion without an authoritative year manifest; no year is interpolated. Review screenshots and Actions for the current HEAD from PR #1.

## Real-Sheet test attempt

At baseline `9371133b0dd9e66a44131f1a7a8b77cdcc77aa1a`, no gateway, runtime reader identity or secret was configured and the environment's request to `sheets.googleapis.com` was denied (proxy 403). A request to copy the production Sheet into Drive root was rejected by automatic approval review: the destination was not verified and the copy could expose sensitive data. No copy or staging-value change was made. Owner action: authorize a protected staging destination and supply a staging Sheet editor and server-side viewer identity, plus allow the required Sheets API route; provide or approve the staging HTTPS environment. No production deployment is authorized.

A loopback-only HTTPS staging gateway and tests now prepare the App → gateway path without an external deployment. Its browser test uses simulated Sheets responses: it is not evidence of a real source read, source change, restore, reauthorization or production live sync. See `docs/OFFICIAL-READ.md` for constraints and procedure; real end-to-end remains NOT VERIFIED.

## GAS and official-content attempt

The Owner-provided GAS `bootstrap`, `version`, `content`, `financial` and an invalid action could not be reached: the enforced proxy denied CONNECT to `script.google.com` with HTTP 403. GAS JSON shapes, revision IDs, redirects, error behavior and access policy remain NOT VERIFIED. Owner/environment action: permit the GAS host and any subsequently verified redirect host for read-only testing, and establish the endpoint's authorized access policy and gateway identity before configuring a same-origin HTTPS service. No production GAS or Sheet was changed.

The connected Sheet read confirmed the three content tabs have seven pages, 23 content entries and eight disclosures. Their point-in-time values are integrated as a clearly non-live snapshot and stable-ID content slots; User overrides remain separate. The prepared same-origin Sheets reader now validates and loads the seven Sheet tabs together, but this is not a GAS adapter and neither backend is deployed. Live GAS integration, content and financial revisions, actual redirects, authenticated browser access and production refresh remain blocked pending the above access and contract verification.

## GAS contract boundary preparation

No JSON examples were present in the task context. A fail-closed four-parser contract boundary and a required-authorizer same-origin handler are prepared with synthetic-only tests. The boundary checks the source version before and after reading the other actions and validates the fixed P1–P7, four plans/60 rows, 23 entries and eight disclosures. It intentionally has no guessed GAS parser or production transport. The real GAS contract, endpoint access policy and redirects, authenticated gateway and live connection remain NOT VERIFIED; the GitHub Pages-compatible gateway design and required fixture mapping are in `docs/OFFICIAL-READ.md`.

## Owner-described GAS envelope fields

`server/gas-actions.mjs` now parses the four Owner-described top-level action envelopes, verifies `success` on the three described success responses, checks independent financial/content revisions before and after the read, and combines their pair into the internal revision. Unit fixtures use hypothetical nested data; actual JSON and full Code.gs remain unavailable. Nested financial/content mapping, bootstrap cross-check and server-owned transport are required injected callbacks and deliberately have no guessed default. Live GAS, gateway authorization and production sync remain NOT VERIFIED. No production access or deployment was attempted.

## Nested GAS contract and transport preparation

Owner-described nested financial/content fields are now mapped by `server/gas-mappers.mjs`; bootstrap is compared against the independent actions. `server/gas-transport.mjs` pins the endpoint and allowed actions and restricts HTTPS redirects, time and size; `server/gas-gateway.mjs` requires a host-supplied authorization function. `docs/GAS-GATEWAY.md` specifies the GitHub Pages-compatible same-origin deployment decisions and separate Owner approval. Contract-fixture and local browser tests pass, but are **not live responses**. Actual bootstrap nesting, field types, timestamp/redirect behavior, endpoint access policy, approved gateway, real read and App live sync remain NOT VERIFIED. No production request, deployment or hosting change was made in this task. This supersedes earlier references to nested mappers being absent.

## Owner-provided schema examples

Owner-supplied abbreviated schema examples are stored in `tests/fixtures/owner-gas-schema-examples.json` and explicitly identify themselves as non-live. The parser now fails closed on service/API/schema versions outside the supplied example. Tests reject the examples' incomplete datasets and bootstrap placeholders, compare example rows with the verified snapshot, and build complete test-only data from that snapshot for the four-action reader. A contract-fixture pass is not a real GAS or App live-sync verification; network access and the authorized gateway remain outstanding.
