# Dream Spex Backend Phase 1 — Authentication and Authorization

## Roles

| Role | Scope |
|---|---|
| `CUSTOMER` | Own profile, addresses, carts, wishlist, prescriptions, orders, reviews, membership, and notifications |
| `FRANCHISE_ADMIN` | Only assigned franchise records: inventory, products offered by that franchise, orders, customers visible to that franchise, reports, and store profile |
| `SUPER_ADMIN` | Platform-wide administration, franchise management, catalog, users, orders, reports, settings, and audit visibility |

Use permissions in addition to roles for future least-privilege separation. A role claim is not sufficient to choose a franchise; the server must derive tenant scope from `user_franchises`.

## Registration and login

1. `POST /api/v1/auth/register` validates name, email or phone, password policy, uniqueness, and consent.
2. Store an Argon2id or BCrypt password hash only. Recommended BCrypt strength is 12+ if Argon2id is unavailable.
3. Create `PENDING_VERIFICATION` user and a short-lived, single-use OTP challenge. Do not store plaintext OTP; store a hash, purpose, attempt count, expiry, and delivery channel.
4. Send OTP through the configured email/SMS provider. Never return the OTP in an API response or log.
5. `POST /api/v1/auth/verify-otp` marks the relevant contact verified and activates the account.
6. `POST /api/v1/auth/login` accepts customer identifier/password or an explicitly selected admin portal flow. Verify the password, active status, lockout, and requested role.
7. Issue a short-lived access JWT and a rotating refresh token. Return the access token in JSON only if the frontend integration chooses bearer headers; preferably use an HttpOnly, Secure, SameSite refresh cookie.
8. Record login success/failure and security events in audit logs without passwords or tokens.

Admin and franchise accounts should be provisioned or invited by a Super Admin rather than open public registration. If MFA is required for production, add it before enabling admin access.

## JWT and refresh strategy

- Access token: 10–15 minutes, signed with an asymmetric key (RS256/ES256), containing `sub`, `roles`, `permissions`, `jti`, `iat`, `exp`, and an authentication-version claim.
- Refresh token: opaque random value or JWT with a 7–30 day lifetime, stored hashed in a server-side `refresh_tokens` table or equivalent cache. Rotate on every refresh and revoke the token family on reuse detection.
- Do not put sensitive profile data, passwords, franchise lists, or payment information in JWTs.
- `POST /api/v1/auth/refresh` rotates the refresh token and issues a new access token.
- `POST /api/v1/auth/logout` revokes the current refresh token family. Password change, disable, or role removal increments the user's authentication version and invalidates access tokens at the next validation check.
- Key material and token secrets come from a secret manager/environment, never source control.

The proposed database list should add `refresh_tokens` when implementation begins: `id`, `user_id`, `token_hash`, `family_id`, `expires_at`, `revoked_at`, `replaced_by_id`, `created_ip_hash`, `user_agent_hash`, timestamps; unique token hash and indexes by user/family.

## OTP, forgot password, and reset

Use a generic response for forgot-password requests so the endpoint cannot enumerate accounts. Example:

1. `POST /api/v1/auth/forgot-password` creates a `PASSWORD_RESET` challenge if an account exists and returns
   `{ "accepted": true, "challengeId": "..." }`. The response shape is identical for unknown identifiers;
   those receive an unpersisted opaque decoy ID. The OTP is delivered only through the configured channel.
2. `POST /api/v1/auth/verify-otp` verifies the six-digit code with max attempts, rate limits, expiry (for example 10 minutes), and single-use semantics.
3. `POST /api/v1/auth/reset-password` accepts the returned `challengeId`, the six-digit OTP, and a new password,
   returning `{ "reset": true, "accepted": true }` after the password update commits.
   The challenge is looked up by ID and `PASSWORD_RESET` purpose, then consumed once. Revoke all refresh tokens
   and active sessions after success.
4. Resend is rate limited per identifier, IP, and device; apply a cooldown similar to the current 30-second UI.

OTP delivery failures must be explicit server errors internally, but external responses should avoid revealing account existence.

## Authorization enforcement

Configure Spring Security as a stateless resource server with a JWT decoder and method security (`@PreAuthorize`). Use DTOs, not entities, in controllers.

- Customer endpoints require `hasAuthority('ROLE_CUSTOMER')` and resolve the current user from `Authentication`.
- Super Admin endpoints require `ROLE_SUPER_ADMIN` or granular permissions.
- Franchise endpoints require `ROLE_FRANCHISE_ADMIN` and a service-layer scope check:
  `user_franchises.user_id = currentUserId AND franchise_id = requestedFranchiseId AND scope_status = 'ACTIVE'`.
- Never accept an arbitrary `franchiseId` from a client as proof of access.
- For list/detail/update/delete operations, add the franchise predicate to the repository query or load through an authorized scope service. A controller-only check is insufficient.
- Super Admin may access all franchises but every cross-tenant action must be audited.

Return `403 FORBIDDEN` when authenticated but unauthorized and `404 NOT_FOUND` for resources intentionally concealed from another tenant, according to the API information-disclosure policy.

## Password and account controls

- Minimum length 12 recommended; reject common passwords and breached-password matches where practical.
- Normalize email case; normalize/validate phone numbers in E.164 form.
- Rate limit login, OTP, reset, and admin endpoints.
- Use generic credential errors and account lockout/backoff after repeated failures.
- Require verified email/phone before sensitive actions.
- Re-authenticate or require OTP/MFA for password, email, payout/payment, role, franchise, and high-risk settings changes.
- Store no demo credentials in production seeds.

## Protected API baseline

Every protected request should have:

1. TLS.
2. Valid issuer, audience, signature, `exp`, `nbf`, and authentication version.
3. Request correlation ID.
4. Bean Validation on JSON/path/query values.
5. Authorization and tenant scope.
6. Audit entry for authentication, permission, financial, inventory, and admin mutations.

Use an `application/problem+json` error body with stable `code`, human-safe `message`, `requestId`, and field errors. Never return stack traces, SQL, tokens, password hashes, OTPs, or provider secrets.

## Frontend integration contract

The current frontend stores a mock user in `localStorage`; this must be replaced with an auth client that calls the API, stores only non-sensitive user/session state, sends `Authorization: Bearer <accessToken>` for API calls, refreshes once on `401`, and redirects to the appropriate portal on refresh failure. Prefer an HttpOnly refresh cookie and in-memory access token to reduce XSS exposure.

Configure Spring CORS with the exact Vercel origin(s), methods, headers, credentials policy, and no wildcard origin when credentials are enabled. Add local development origin separately. CSRF protection is required for cookie-authenticated state-changing requests; bearer-only APIs still need normal input and origin protections.
