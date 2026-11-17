# PR #1 Codex runner — review-only draft

This workflow is a bounded manual proposal, not an autonomous writer. It has no
repository write permission and never applies a patch. Codex runs last in its
job; the separate recording job treats its final response as untrusted text.
Only the `codex/phase1-one-time-saving` dispatch ref is accepted. One action
invocation per run, no automatic triggers or retries, a 20-minute timeout, and
a PR-specific concurrency group limit execution. GitHub concurrency can
replace a pending run; it is not a durable queue or a lock against other tools.

The workflow must exist on the default branch before GitHub can dispatch it;
its presence on PR #1 does not activate it. Do not merge or deploy to enable it
without Product Owner approval. The action requires an Actions secret named
`OPENAI_API_KEY`. Use a dedicated restricted key and configure an actual API
project spending limit independently; a timeout or one invocation is not a
spending cap. Do not put the key in this repository or in chat.

Before enabling any writing or secret-bearing dispatch, review the workflow and
its pinned actions as trusted code, verify branch protections and Actions
permissions, protect workflow changes, and configure appropriate environment
approval. The GitHub API was inaccessible during initial setup. The current
workflow does not validate latest PR HEAD before writing because it cannot
write; it does not verify tests or automatically trigger subsequent runs. A
future writer needs a separate trusted job that verifies the exact base SHA,
validates an approved patch without executing it, fails closed on concurrent
updates, and uses permissions that respect branch protection. An independent
unprivileged job must run tests on the candidate before any approved write.
Never run repository code in a privileged writer job.

A controlled first run, Codex authentication, API spending enforcement,
concurrency behavior, GitHub Actions tests and the writer remain unverified.
