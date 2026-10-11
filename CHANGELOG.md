# Changelog

Versions follow the portfolio rule: every pushed change bumps the version; pre-1.0 the second number is the
breaking-change number.

## 0.1.1 - 2026-10-11

Covers PRs #1 and #2 (which shipped without a bump) and this change.

- Initial site, CI gates and Cloudflare runbook (#1).
- DS check result for `.us` and `.foundation`; fix the Windows DS command (#2).
- CI: every `uses:` pinned to a full commit SHA (checkout v7.0.1, setup-node v7.1.0, cache v6.1.0,
  upload-artifact v7.0.2), replacing mutable `@v4` refs.
- Add `.github/CODEOWNERS`.
- `docs/VERIFY-FINDINGS.md`: the deliberate 404 citation is plain text with a note, not a link.
