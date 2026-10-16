# Changelog

Versions follow the portfolio rule: every pushed change bumps the version; pre-1.0 the second number is the
breaking-change number.

## Unreleased

Docs only; the version is allocated at gate.

- `ops/cloudflare/RUNBOOK.md`: the DNSSEC order of operations (check for an existing DS, remove it and wait its TTL,
  change nameservers, wait for Active, then enable DNSSEC in Cloudflare and add the DS), replacing the unordered
  "enable DNSSEC at the registrar" wording. Source: Cloudflare's DNSSEC docs page.
- `docs/VERIFY-FINDINGS.md` row 7: points at that order.

## 0.1.1 - 2026-10-11

Covers PRs #1 and #2 (which shipped without a bump) and this change.

- Initial site, CI gates and Cloudflare runbook (#1).
- DS check result for `.us` and `.foundation`; fix the Windows DS command (#2).
- CI: every `uses:` pinned to a full commit SHA (checkout v7.0.1, setup-node v7.1.0, cache v6.1.0,
  upload-artifact v7.0.2), replacing mutable `@v4` refs.
- Add `.github/CODEOWNERS`.
- `docs/VERIFY-FINDINGS.md`: the deliberate 404 citation is plain text with a note, not a link.
