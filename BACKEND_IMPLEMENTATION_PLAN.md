# Dream Spex Backend Phase 1 — Implementation Plan and Integration

## Recommended stack

- Java 21
- Spring Boot 3.x and Maven
- Spring Web MVC, Spring Data JPA, Hibernate
- Spring Security OAuth2 Resource Server/JWT plus a refresh-token service
- Jakarta Bean Validation
- MySQL 8 or MariaDB with HikariCP
- Flyway migrations
- Spring Mail; an SMS/WhatsApp provider for OTP if phone verification is required
- springdoc-openapi for Swagger/OpenAPI
- JUnit 5, Mockito, Spring Security test, Testcontainers MySQL/MariaDB
- Object storage SDK for prescription/product media
- Provider SDK/webhook verification for payments and memberships

## Package structure

```text
com.dreamspex
├── DreamSpexApplication.java
├── config
│   ├── CorsConfig.java
│   ├── OpenApiConfig.java
│   ├── JacksonConfig.java
│   └── PropertiesConfig.java
├── security
│   ├── SecurityConfig.java
│   ├── JwtAuthenticationConverter.java
│   ├── CurrentUser.java
│   ├── FranchiseAuthorizationService.java
│   └── RefreshTokenService.java
├── common
│   ├── dto/PageResponse.java
│   ├── dto/ProblemResponse.java
│   ├── exception/
│   ├── validation/
│   └── audit/
├── auth
│   ├── controller/
│   ├── dto/
│   ├── entity/
│   ├── repository/
│   └── service/
├── user
├── franchise
├── catalog
├── inventory
├── cart
├── wishlist
├── checkout
├── order
├── payment
├── membership
├── coupon
├── review
├── prescription
├── store
├── banner
└── notification
```

Keep entities/repositories internal to modules. Controllers accept request DTOs and return response DTOs. Services own transactions and business rules. Repositories expose scoped queries rather than unconstrained `findAll()` methods.

## Delivery phases after approval

### Phase 2 — Foundation and identity

1. Create Spring Boot project, profiles, structured logging, correlation IDs, problem responses, OpenAPI, and Flyway baseline.
2. Implement users/roles/permissions, password hashing, registration, login, OTP, reset, refresh rotation, logout, and CORS.
3. Seed roles/permissions only; do not seed production credentials.
4. Add unit/security integration tests for all three roles and tenant denial.

### Phase 3 — Catalog and public content

1. Implement categories, products, variants, images, banners, stores, and public plans.
2. Add pagination, search, filters, sorting, validation, and cache headers.
3. Replace static frontend imports with catalog APIs.
4. Add admin catalog/inventory APIs with audit history.

### Phase 4 — Customer state

1. Persist profiles, addresses, carts, wishlist, prescriptions, and approved reviews.
2. Support anonymous cart token and login merge.
3. Move coupon validation and totals to the server.
4. Add object storage upload with signed URLs and malware scanning.

### Phase 5 — Checkout, payments, and fulfillment

1. Implement quote, stock reservation, idempotent order creation, order status history, and delivery availability.
2. Integrate a real payment provider in test mode; verify webhook signatures and replay/idempotency.
3. Add COD policy, refund/cancel/return states, and franchise fulfillment scope.
4. Replace payment demo and static tracking screens only after end-to-end sandbox tests.

### Phase 6 — Membership and operational dashboards

1. Implement membership purchase/webhooks/renewal/cancellation.
2. Replace franchise and Super Admin mock dashboards with scoped aggregates.
3. Add notifications, reports, user/franchise management, and audit views.
4. Decide and implement wallet, referral, service booking, contact/newsletter, and after-sales persistence.

## Frontend integration plan

### Configuration

Add a future frontend environment value such as `VITE_API_BASE_URL=https://api.dreamspex.in`. Do not hardcode production URLs or credentials. The current frontend should remain unchanged during this Phase 1 documentation task.

Introduce one API client module later, using Axios or `fetch`, with:

- JSON default headers and `AbortController` timeouts.
- `Authorization` bearer access token.
- one guarded refresh attempt on `401`.
- request correlation ID.
- typed response/error DTOs.
- multipart handling for prescription files.

### Replacing mock data

Replace imports from `mockData.ts` in this order:

1. `categories`, `products`, product detail/reviews, banners, stores.
2. `ShopContext` cart/wishlist/coupon/delivery methods.
3. auth service and `AuthProvider`.
4. checkout/payment/order screens.
5. prescription and membership screens.
6. franchise/admin pages.

Loading, empty, retry, and error states should be explicit. A server success response must not be inferred from navigation alone. Client totals remain display hints; checkout uses the quote/order returned by the server.

### Protected routes

Keep the existing route guards as UX guards, but derive them from an API-validated session. On initial load, call `/auth/session` or use the refresh flow; never trust a locally edited role. Hide navigation based on permissions, but rely on backend authorization for enforcement.

### CORS and cookies

Allow only the deployed Vercel origin(s) and approved development origin. If refresh tokens use cookies, set `HttpOnly`, `Secure`, `SameSite=Lax/None` as deployment requires, configure `allowCredentials`, and use CSRF protection for state-changing requests. Do not use `Access-Control-Allow-Origin: *` with credentials.

## Testing and quality gates

- Unit tests: password rules, OTP expiry/attempts, coupon rules, totals, order transitions, inventory reservation, franchise authorization.
- MVC tests: validation and stable problem responses for each controller.
- Security tests: unauthenticated, wrong-role, wrong-franchise, disabled-user, expired-token, refresh-reuse cases.
- Repository tests with Testcontainers for unique constraints and transaction behavior.
- Payment webhook contract tests with invalid signatures, duplicates, out-of-order events, and amount mismatch.
- OpenAPI review against the endpoint mapping before frontend integration.
- Run Maven verify, Flyway validation, and a smoke deployment against a non-production database.

## Production and security checklist

- TLS at the edge and database encryption/backups.
- Argon2id/BCrypt, rate limits, lockout/backoff, MFA decision for admins.
- JWT key rotation and secret manager; no secrets in Git, Vite env, logs, or error bodies.
- Parameterized JPA queries and bounded pagination; no string-built SQL.
- Server-side price, stock, coupon, tax, shipping, and payment verification.
- Idempotency for checkout, payments, membership webhooks, and retryable mutations.
- Least-privilege database account, network restrictions, migrations reviewed and backed up.
- Structured logs with request/user/franchise IDs but no PII, tokens, OTPs, payment payload secrets, or prescription contents.
- Metrics and alerts for auth failures, payment mismatch, stock conflicts, webhook failures, and 5xx responses.
- Retention/deletion policies for profiles, prescriptions, uploads, audit logs, and orders.
- Regular restore-tested backups and disaster-recovery runbooks.
- Admin actions and cross-franchise access audited.

## Phase 1 acceptance criteria

Phase 1 is complete when:

1. The five architecture documents exist and are internally consistent.
2. Every existing route and major stateful flow is classified as verified, mock, or incomplete.
3. Schema relationships and tenant ownership are explicit.
4. API contracts cover verified frontend capabilities and identify optional scope.
5. Authentication, refresh, OTP, role authorization, and franchise isolation are implementable without trusting browser state.
6. No Spring Boot source, SQL migration, frontend change, fake payment success, or production credential was introduced.

Stop here for approval. Phase 2 should begin only after confirming payment, shipping/tax, storage, OTP provider, membership, prescription privacy, and optional feature scope.
