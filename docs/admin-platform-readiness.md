# One-Time-Off — AVA Studio Admin Integration Readiness

Status: **BLOCKED — implementation/deployment prerequisites unverified**. This is a preparation record, **not** an enabled Admin feature or production release.

## Current, source-verified baseline

- Independent App: `ivancww/one-time-off`. Frontstage `?avaEntry=frontend` and User Edit `?avaEntry=user` remain operational under their existing contracts.
- `src/main.js` intentionally fails closed for `?avaEntry=admin`, showing 「此功能尚未開放」; no writable Admin editor exists.
- AVA Platform's single `MODULE_REGISTRY` already contains One-Time-Off. Its Admin capability is **disabled** and must remain disabled until the live integration gates pass.
- App Official data is currently bundled in `data/official-snapshot.json`, labelled a **manual non-live snapshot**; `index.html` has an empty `official-data-endpoint`. A read-only GAS contract test or Sheet URL does **not** prove a deployed, authenticated Official backend.
- Existing `User Edit` IndexedDB, local draft, backup/restore, PWA Shell, release-update mechanism, financial projections, and Google Sheet values must be preserved unchanged.

## Proposed security architecture — no shortcut

1. Launch solely from authenticated AVA Studio, using the standard `ava-admin-session-v1` contract: valid Platform Admin session; App-bound one-time ticket/nonce; retained-opener browser handshake and proof; same-origin/App ID/expiry/replay validation.
2. App-owned GAS backend exchanges the browser-bound proof server-to-server and checks the signed, session-bound AVA Admin Session Proof. Every Official write validates the grant again through the Platform verifier, with operation and App ID; invalid, expired, revoked, wrong-origin, copied-URL, replayed, or unsupported requests fail closed.
3. App-owned Admin controls **Official Layer only** (publishing/authoritative content or datasets as expressly approved). No editing of local User Overrides; no password duplicated in App, no secrets in GitHub Pages/client, QR, URL or browser storage.
4. Platform's existing registry entry may set `admin: true` and its canonical admin destination **only after** the App code, live backend and session proof pass all mandatory gates. No second App card, copied business code or parallel Platform admin page.
5. An Admin return link navigates to the real AVA Studio surface; return URL is not proof of authorization. Preserve frontend and user routes, user backup and all financial calculations.

## Prerequisites to obtain/verify before backend implementation

- The complete, **currently deployed** One-Time-Off GAS project, including exactly one effective `doGet` and `doPost`, all referenced handlers, deployed immutable version, deployment ID, Web App endpoint, and actual approved Sheet bindings/tabs.
- Non-secret names/presence of required GAS Script Properties and authoritative Platform verifier endpoint; ensure `one-time-off` is explicitly allowlisted via backend-managed `AVA_ADMIN_APP_IDS`. Never put values/secrets in a PR.
- Agreed scope of Official fields editable by Admin, with schema validation, revisioning, atomic updates, rollback and audit/change history; do not infer withdrawal values or overwrite manual snapshots without verified source terms.
- Backend deployment authority and Owner approval for real Official writes; browser-based full login/launch tests through deployed AVA Studio.

## Mandatory gate record

| Gate | Current status | Required evidence |
| --- | --- | --- |
| App `?avaEntry=admin` unauthenticated denial | PASS (source inspection) | Currently explicitly disabled in `src/main.js` |
| Front/User preservation | NOT TESTED (this preparation PR) | Full existing regression suite, Save Local and PWA |
| GAS complete source vs immutable deployed version | BLOCKED | Production script and deployment inspection |
| GAS GET/POST action routing | BLOCKED | Real deployed endpoint GET/POST evidence |
| Platform `ava-admin-session-v1` compatibility | BLOCKED | Back-end proof exchange and verification |
| Official Read / schema / revision | BLOCKED | Live authorized Official data response |
| Official Write / ownership preservation | BLOCKED | Authorized test revision and read-back |
| Copied URL, replay, wrong App, expired/revoked grant rejection | NOT TESTED | Server negative tests on deployed GAS |
| Browser-bound AVA Studio launch/return | NOT TESTED | Deployed browser E2E |
| Physical iPad and HONOR Magic V5 | NOT TESTED | Real-device test |
| Platform registry Admin enablement | BLOCKED | All prior security gates PASS and separate Platform PR |

## Planned implementation sequence

1. Inspect and reconcile deployed GAS and Official data contract; prepare App-owned backend change in a focused PR.
2. Implement App Admin screen, fail-closed browser proof handshake, App-owned backend read/write and negative-security tests. Bump App semantic version and release history for production-facing change.
3. Pass App CI, real deployed GET/POST, Official read/write, replay/expiry/session revocation and device checks; request Owner review and approval before App merge/deploy.
4. **Then** update the existing One-Time-Off registry capability in a separate AVA Platform Draft PR, perform Platform integration E2E, obtain Owner approval and deploy.
5. Never merge/deploy on the strength of this document alone.

References: `ivancww/avaplatform/docs/MOTHER-RULES.md`, `docs/ava-studio-admin-authentication.md`, `docs/one-time-off-module-integration.md`.
