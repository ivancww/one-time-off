# PR #1 continuation checklist

Status: prototype; not ready for final review. User entry supports two explicitly user-owned notes with batch IndexedDB save, readback and validated JSON import/export; this is not complete Unified User Edit. Admin remains unsupported and is not authorized by URL parameters. The projection chart supports year selection and the
comparison page lets the user select a shared policy year. Continue on
`codex/phase1-one-time-saving`, after fetching PR #1 and checking for concurrent
writers. Do not merge or deploy without Product Owner approval.

- [ ] Obtain an authorized, documented official-data interface and version / freshness contract; validate and cache data with explicit stale and offline behavior. The bundled manual snapshot has structural checks but no independently verified current version or live refresh.
- [ ] Verify the official withdrawal start, basis, payment timing, guarantees, charges and policy provisions. Keep withdrawal cash-flow and combined-value calculations disabled until verified.
- [ ] Implement and verify current Mother Standard frontend, User Edit (including the approved Preview / Save Local contract), Admin and central authentication boundaries. Do not interpret an entry parameter as authentication.
- [ ] Complete in-place User Edit, durable drafts and approved page customization; audit and extend the current two-note IndexedDB and backup/restore implementation, including failure and migration tests.
- [ ] Implement and test app-shell update and offline behavior according to the current Mother Standard; do not present a stale snapshot as current.
- [ ] Complete customer flow, accessible navigation, print/PDF and responsive presentation; verify true device, WebView and installed-PWA behavior.
- [ ] Complete financial precision, source failure, security, accessibility and browser regression tests and review screenshots across the required device matrix.
- [ ] Verify GitHub Actions for the final PR HEAD; GitHub API access was forbidden in this environment. Check PR state and other writers before pushing.
- [ ] Review against the then-current merged Mother Standard and Design System. Confirm Product Owner review before merge or deploy.

The API-billed Codex runner draft is not enabled by this task. No future
background execution is claimed.

## Current User Edit checkpoint
Seven sales-page headings can be edited in their original position and saved in
one IndexedDB write; v1 two-note backups are accepted as a v2 draft and the old
stored record is migrated in memory without overwriting it until Save. Official
values and disclosures remain read-only. Custom page insertion, ordering and
visibility are not implemented. Browser workflow runs simulated viewports only;
installed PWA, WebView and physical devices remain unverified. PWA shell updates,
live data adapter integration and persistent official-data caching remain open.
