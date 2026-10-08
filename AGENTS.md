# Repository working instructions

Use the existing checkout; do not create a Git worktree unless explicitly requested. Preserve user data and local credential files. Never log or commit secret values.

## Required development report

The user requires a cumulative repository report. Update `docs/gelistirme-raporu.md` with every meaningful code, configuration, deployment, or user-flow change, in the same commit as the change. Preserve prior history and update the current-state and workflow sections when affected. Record what changed, why, the tests actually run and their outcomes, deployment target/status, and any remaining limitations. Do not claim skipped or unrun checks passed. Add the feature commit reference when known; do not amend history just to make a report refer to its own commit.

Keep the report readable in Turkish. Do not include passwords, tokens, cookies, environment values, operational record dumps, or personal data. GitHub code history and operational database records are different: pilot data stays in its separate Cloudflare store.

## Production approval boundary

The maintenance work remains a pilot on `maintenance-test`, deployed only to `vagontakip-test`. The user explicitly requires approval before merging to `main` or deploying this work to production `vagontakip`. Permission for test deployment is not production permission. Documentation-only requests do not authorize application deployment. Preserve live and test data; roll back code with a new commit, never reset database content or force-push.

See `docs/maintenance-pilot.md` for local startup, targeted validation, deployment and isolation details. Use tests appropriate to the change; documentation-only updates normally require checking formatting, links and Git diff, not rebuilding the application.
