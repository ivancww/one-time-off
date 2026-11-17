# Proposed same-origin GAS gateway

Status: **prepared source components only; not deployed or approved**. GitHub Pages is static and cannot serve the authenticated `/official` handler. An Owner-authorized HTTPS reverse proxy or equivalent gateway on an approved custom domain must serve both the GitHub Pages static App and `/official` under the same browser origin. DNS, platform routing, session issuance and production hosting are outside this PR and require separate Owner approval.

| Configuration | Required deployment decision |
| --- | --- |
| App origin | Approved HTTPS custom origin; route static App assets to the authorized GitHub Pages origin, preserving App paths and existing PWA scope. |
| Official route | Exact same-origin `GET /official` routed to a service mounting `createOfficialGasHandler`. Set `official-data-endpoint` in the deployment build to that same-origin path. |
| Caller authentication | Supply a real server-side `authorize(req)` integration with the Owner-approved identity/session policy; deny by default. The library has no login, session issuance or public access policy. |
| Upstream | The server transport is pinned to the Owner-provided GAS URL and four read-only actions. It omits browser cookies and credentials, follows only HTTPS redirects to `script.googleusercontent.com/macros/echo`, limits redirects, time and response size, and rejects non-JSON/error responses. The actual redirect and access policy remain unverified. If the deployed endpoint needs credentials, add a reviewed server-side identity integration and do not forward secrets to redirect hosts. |
| Cache | `/official` responses are `no-store`; the existing App validates and stores confirmed envelopes in its separate IndexedDB cache. A failed read uses labelled cache or snapshot; User Edit storage and backups remain separate. |

Before approval, verify actual sanitized `bootstrap`, `version`, `content` and `financial` responses and errors against the Owner-described contract, actual redirect destinations, authorization and data visibility, session/CSRF controls, upstream identity if required, certificate trust, timeouts and rate controls. Test a source revision change, no-store headers, unauthorized and malformed requests, offline cache/recovery, source and User isolation, PWA scope and the App origin end-to-end. A schema fixture or authenticated Sheet connector read is not evidence that the deployed GAS or gateway works. The current contract intentionally rejects a financial row count other than 60 pending an explicit reviewed change.
