# Independent App release preparation — 17 November 2026 (Hong Kong)

Status: preparation only. App PR #1 and Platform PR #80 remain Draft. Nothing has been merged, deployed or enabled in production.

## Deployment identity and boundary

The repository currently has no verified deployed App URL. Reading its GitHub Pages settings via the available API returned `Forbidden`; this is an API access restriction, not proof that Pages is disabled. App main remains the initialization commit. No App URL is entered in Platform.

If the Owner selects GitHub's default project-site hosting for `ivancww/one-time-off`, the conditional target is `https://ivancww.github.io/one-time-off/`. This is **not a verified deployment URL**. Do not publish or register it based on this document. The configured Pages URL and the approved deployment action's `page_url` output must establish the actual canonical HTTPS URL, followed by browser verification. A custom domain or another base path requires separate verification.

The package uses relative asset, manifest and worker URLs. Under the tested `/one-time-off/` prefix, manifest scope is `/one-time-off/`, start URL resolves to `/one-time-off/?avaEntry=frontend`, and the worker controls only that App path. All seven original page IDs, exact-year calculations and data schemas are preserved. Return to AVA remains the already verified Platform destination `https://ivancww.github.io/avaplatform/`; User Edit/preview returns with `?avaSurface=user`.

`tools/build-pages.mjs work/pages FULL_SHA` creates a new, allowlisted static directory containing only eight runtime assets, `.nojekyll` and `release.json` (source SHA and asset hashes). It excludes server code, gateway configuration, tests, tools, fixtures, credentials and repository metadata. Existing output is rejected rather than overwritten. The official endpoint stays empty: this package uses the validated, accurately labelled SNAPSHOT. No localhost/mock data destination is configured. The existing localhost worker-registration condition is development-only and is not a source URL.

## Approval sequence — do not execute during preparation

1. Review both Draft PRs, current CI, product-rule limitations and this release plan. Product Owner explicitly approves the App merge as a separate action; this task does not perform it.
2. Owner confirms the intended Pages project/domain, build source `GitHub Actions`, and a protected `github-pages` environment with required release reviewers. These are settings/hosting actions requiring approval; no settings are changed here. Confirm that any existing deployment mechanism will not publish the repository root or compete with this workflow.
3. Review the final main SHA and its successful Quality Gate, Browser QA and static artifact. The Owner separately approves publishing that exact SHA. Approval to merge alone does not authorize deployment.
4. Only after approval, the repository Owner may run `Owner-approved One-Time-Off Pages release` on **main**, supplying the full `approved_sha` equal to main's SHA and `approve_publish=true`. The workflow cannot publish on PR/push, defaults approval to false, and restricts dispatch execution to the repository Owner. `configure-pages` uses `enablement: false`; missing Pages configuration must fail instead of enabling it. The protected environment supplies the additional review gate. No release workflow has been run.
5. Record the action URL, artifact SHA and actual `page_url`. Check HTTPS, redirects, subpath assets, manifest/scope/offline upgrade, `release.json`, Front and User entries, Preview → Save Local → reopen, custom pages, backup restore, Official/User isolation and Return to AVA on that actual URL. Physical iPad/HONOR and installed PWA/WebView tests remain required.
6. Only after those gates pass, review an update to the **existing** Platform MODULE_REGISTRY record: verified Front/User URLs, visibility and User capability. Admin stays false. Keep the record `deployment-pending` until then. Platform merge/deployment also requires separate Owner approval.

The PR artifact workflow has only `contents: read` and uploads a review artifact; it cannot deploy. Do not configure an API-billed runner or run the existing Codex runner for this task.

## Evidence and remaining gates

The loopback packaged-artifact test covers the exact `/one-time-off/` base path, static assets, manifest, worker control, offline query navigation, backup restore including a text custom page, and Preview Save/reopen. It runs browser and simulated standalone modes at iPad portrait (768×1024), landscape (1024×768), HONOR unfolded (800×1024) and folded (392×852). It checks all seven official pages for overflow and title wrapping parity, navigation clipping, four arrangements and the year-20 HK$500,000 × 1.301945 = HK$650,972.50 calculation. The displayed financial formatting remains the existing presentation. No physical device or installed PWA is certified by these simulations.

The separate cross-repository test uses real Platform/App code on loopback origins, promotes only the in-memory test registry, and maps the existing Return destination to local Platform. Production registration remains hidden. This is **SIMULATED INTEGRATION PASS**, not deployed integration.

GAS contracts, financial/content mapping and authenticated same-origin gateway preparation remain intact. Prior browser JSON observations and fixture tests do not establish authenticated App live synchronization. **APP LIVE SYNC NOT VERIFIED**. An approved authenticated same-origin HTTPS gateway and genuine App end-to-end read/revision/recovery evidence are a separate release gate, not a prerequisite to this snapshot-based staging test. GitHub Pages cannot run the gateway. Do not expose an unauthenticated proxy or loosen same-origin checks. Unsupported withdrawal amounts remain unavailable until commencement, base, frequency and timing are verified.

Remaining: canonical deployment URL/Pages configuration verification; explicit merge and exact-SHA publish approvals; deployed cross-repository tests; physical iPad/HONOR folded/unfolded, installed PWA and WebView QA; authenticated gateway/live-sync verification; product-rule approval. No production Sheet, GAS, Firebase, DNS or auth policy has been changed.
