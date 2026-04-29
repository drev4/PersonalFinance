# Security Policy — Finanzas API

This document describes the security posture of the `@finanzas/api` service,
how the team responds to vulnerabilities, and the operational procedures every
engineer is expected to follow.

> Last reviewed: 2026-04-22

---

## 1. OWASP Top 10 (2021) — Control Status

| #   | Risk                               | Status    | Notes                                                                                                                                                                                                 |
| --- | ---------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Broken Access Control              | Mitigated | Every route runs behind `requireAuth` (JWT). Repositories scope queries by `userId` to prevent IDOR. Ownership re-checked before updates/deletes (see `validateAccountOwnership`).                    |
| A02 | Cryptographic Failures             | Mitigated | AES-256-GCM for sensitive payloads (`utils/crypto.ts`). JWTs signed with distinct secrets per token type; bcrypt cost 12 for password hashing. HSTS with preload enabled.                             |
| A03 | Injection                          | Mitigated | Mongoose schemas cast all inputs. `$regex` values passed through `escapeRegex()`. `__proto__`/`constructor`/`prototype` stripped from every request body by the `sanitize-plugin` preValidation hook. |
| A04 | Insecure Design                    | Mitigated | Rate-limit tiers per risk (auth, heavy, search, global). Refresh-token rotation with whitelist+blacklist in Redis. Email-enumeration defended by constant-time responses in login/forgot-password.    |
| A05 | Security Misconfiguration          | Mitigated | Helmet CSP strict (`default-src 'self'`). Production env boot guard rejects short/default secrets and missing `FRONTEND_URL`. CORS whitelist resolved at boot per `NODE_ENV`.                         |
| A06 | Vulnerable & Outdated Components   | Monitored | `pnpm audit --prod` runs in CI (see §4). Renovate/Dependabot PRs require green tests before merge.                                                                                                    |
| A07 | Identification & Auth Failures     | Mitigated | `safeCompare()` for all token/hash checks (timing-safe). Account lockout enforced via IP-level ban after 3 bursts on auth routes. 2FA available; secrets stored encrypted with AES-GCM.               |
| A08 | Software & Data Integrity Failures | Mitigated | Lock-file committed (`pnpm-lock.yaml`). CI verifies integrity on install. No dynamic `eval`/`Function` usage. Webhooks validated via HMAC.                                                            |
| A09 | Security Logging & Monitoring      | Mitigated | `utils/logger.ts` with pino redaction of passwords, tokens, API secrets, 2FA codes, encryption IVs. Audit log retained 365 days (TTL). Access/error logs shipped via Fastify logger.                  |
| A10 | Server-Side Request Forgery (SSRF) | Mitigated | Outbound HTTP limited to vetted integrations (CoinMarketCap, Finnhub, Binance, Plaid). No user-supplied URLs are fetched server-side.                                                                 |

---

## 2. Secret Rotation

### 2.1 Inventory

| Secret                             | Purpose                                        | Min length (prod)       | Rotation SLA                  |
| ---------------------------------- | ---------------------------------------------- | ----------------------- | ----------------------------- |
| `JWT_SECRET`                       | Signs access tokens                            | 64 chars                | 90 days                       |
| `JWT_REFRESH_SECRET`               | Signs refresh tokens                           | 64 chars                | 90 days                       |
| `ENCRYPTION_KEY`                   | AES-256-GCM key for integrations / 2FA secrets | 64 hex chars (32 bytes) | 180 days or on suspected leak |
| `BINANCE_API_KEY` / `_SECRET`      | Exchange integration                           | Provider default        | On rotation by provider       |
| `CMC_API_KEY`                      | Crypto prices                                  | Provider default        | On rotation by provider       |
| `FINNHUB_API_KEY`                  | Stock quotes                                   | Provider default        | On rotation by provider       |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Bank linking                                   | Provider default        | On rotation by provider       |

### 2.2 Procedure

1. Generate a new secret:
   - JWT/refresh secrets: `openssl rand -hex 48` (≥ 64 chars).
   - `ENCRYPTION_KEY`: `openssl rand -hex 32` (exactly 64 hex chars = 32 bytes).
2. Add the new value to the secrets manager (AWS Secrets Manager / 1Password /
   Doppler — whichever the environment uses) under a versioned name.
3. Re-encrypt existing ciphertexts if rotating `ENCRYPTION_KEY`:
   - Run the migration script `scripts/rotate-encryption-key.ts` with
     `OLD_ENCRYPTION_KEY` and `ENCRYPTION_KEY` set.
   - The script decrypts with the old key and re-encrypts with the new one
     per document; it is idempotent and resumable.
4. Deploy the new env to staging; run the full test suite + manual smoke test
   (login, integration add, 2FA enable, password reset).
5. Promote to production during a low-traffic window.
6. **Invalidate old JWTs** by bumping `JWT_KEY_VERSION` (if rolling) or
   forcing logout-all via `POST /admin/sessions/revoke-all`.
7. Mark the rotation complete in the security ledger (Notion: "Secret Rotation
   Log").

### 2.3 Emergency rotation (compromise)

- Skip staging. Deploy the new secret straight to production.
- Blacklist every refresh token in Redis (`DEL refresh:*` via the rotation
  runbook — never run unscoped `FLUSH*`).
- Notify users within 72 hours if PII could have been exposed (GDPR Art. 33).

---

## 3. Dependency & Vulnerability Management

### 3.1 `pnpm audit` in CI

The CI pipeline runs:

```bash
pnpm audit --prod --audit-level=high
```

- The step fails the build on any `high` or `critical` advisory against a
  production dependency.
- `dev` dependencies are audited separately (non-blocking) and triaged weekly.
- Exceptions must be documented in `.pnpm-audit-ignore` with a CVE ID, a
  justification, and a review deadline (max 30 days).

### 3.2 Scheduled scans

- **Daily** — Dependabot / Renovate opens PRs for patch-level bumps.
- **Weekly** — Trivy scan of the built Docker image (`trivy image --severity HIGH,CRITICAL`).
- **Monthly** — Manual review of `pnpm outdated` to keep minor/major bumps
  from drifting too far.

### 3.3 Disclosure

Security issues should be reported to `security@finanzas.app` (PGP key on the
website). A first response is guaranteed within **48 hours**, a triage within
**5 business days**, and a fix targeting **30 days** for high-severity issues.

---

## 4. Log & Data Retention

| Collection                            | Retention | Mechanism                                            |
| ------------------------------------- | --------- | ---------------------------------------------------- |
| `auditLog`                            | 90 days   | Mongo TTL index on `createdAt` (`auditLog.model.ts`) |
| `notification`                        | 90 days   | Mongo TTL index on `createdAt`                       |
| Access logs (stdout → log aggregator) | 90 days   | Aggregator retention policy                          |
| Error logs                            | 180 days  | Aggregator retention policy                          |
| Metrics                               | 400 days  | Prometheus retention                                 |

**Note:** The 90-day TTL is the _default_ retention. Deployments subject to
local legal requirements (e.g. Spanish AEPD / PSD2 may require up to 5 years
for financial-transaction audit trails) must raise the value in
`auditLog.model.ts` and drop the existing `createdAt_1` index before the new
TTL can be built — Mongo will not silently change a TTL on an existing index.

---

## 5. Hardening Checklist (runtime)

- [x] Helmet CSP strict (no `unsafe-eval`, no third-party sources).
- [x] HSTS with preload.
- [x] CORS whitelist per environment; `credentials: true` only for allowed origins.
- [x] Rate limit tiers: auth / heavy / search / global.
- [x] Redis-backed rate limit (consistent across replicas).
- [x] `X-Content-Type-Options: nosniff` on every response.
- [x] `X-Frame-Options: DENY` on every response.
- [x] `Cache-Control: no-store` on sensitive routes.
- [x] Prototype-pollution sanitizer on every request body/query/params.
- [x] Regex-meta escape before passing user input to Mongo `$regex`.
- [x] `safeCompare` (timing-safe) for every token / hash check.
- [x] Pino redaction of passwords, secrets, tokens, 2FA codes, IVs.
- [x] Production-only guards for secret length and `FRONTEND_URL`.
- [x] `ensureIndexes()` on boot so missing indexes surface early.
- [x] `.lean()` on read-heavy queries (transactions, holdings).
- [x] Redis-cached net-worth with 30s TTL.

---

## 6. Incident Response

See `docs/runbooks/security-incident.md` for the full playbook. Quick links:

- **Suspected credential stuffing** — increase auth rate-limit ban to 1h;
  force password reset on matching accounts.
- **Leaked integration secret** — rotate via §2.3 and notify the provider.
- **Suspected data exfiltration** — freeze account (`PATCH /admin/users/:id/freeze`),
  export audit log, engage legal/privacy lead.

---

## 7. Contact

- Security lead: `security@finanzas.app`
- On-call (PagerDuty): `finanzas-api-oncall`
