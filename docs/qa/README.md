# Presentation QA

The projection screenshots show the one-time app with its bundled snapshot, using simulated viewport sizes. `5pay-reference-fixture.png` renders the actual 5Pay frontend's P6 view with illustrative fixture data because its live endpoint was unavailable in this environment. Its values are not source data for this app. The layout comparison covers contribution, year chips and result hierarchy; it does not validate real-device or live-source behavior.

The `diagnostics-*` captures use a mocked endpoint in User Edit mode. `LIVE` here describes that simulated endpoint; it does not demonstrate a Google Sheet or production connection. The simulated revised 1.35 multiplier and HK$675,000 result are test-only values. iPad and HONOR captures are viewport simulations, not physical devices.

Content and financial update tests in this revision use simulated endpoint responses; the official text snapshot was read separately from the Sheet. Screenshots do not demonstrate GAS connectivity. Viewports are simulated.

`platform-entry-*` images show local Platform/App integration with a test-only promoted registry and loopback App URLs. Production registration stays hidden/disabled. Tablet viewports and standalone browser state are simulated; no physical device or deployed integration is claimed.

## Final release preparation — 17 November 2026 (Hong Kong)

`release-browser-{ipad,ipad-landscape,honor-folded}.png` and `release-standalone-honor-unfolded.png` show the allowlisted static artifact served only on loopback under `/one-time-off/`. The extra custom page is test User data, not a change to the seven Official pages. The snapshot source label is intentional. All four viewport sizes also run in both ordinary-browser and simulated standalone modes; CI retains all captures. Tests check every official page for overflow and tablet title wrapping parity, Preview → Save → reopen, custom text backup/restore, four plans and exact-year calculation. Zero online console/page errors were observed in the packaged App. Offline/reconnection preserves User data and the scoped worker shell.

`platform-entry-honor-folded.png` extends the registry-navigation test to folded width. Actual Platform/App code runs on two loopback origins with test-only registry promotion; Return-to-AVA requests are mapped to local Platform by test routing. These images are **simulated integration**, not a canonical deployment, installed PWA, physical device, live Sheet read or authenticated GAS live sync. Live deployment and physical-device gates remain open.
