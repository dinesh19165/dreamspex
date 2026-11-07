# Dream Spex API

Spring Boot 3.4 / Java 21 backend foundation for Dream Spex.

## Local startup

Set the database values in the process environment, then run:

```powershell
$env:SPRING_DATASOURCE_URL = "jdbc:mysql://localhost:3306/dreamspex?serverTimezone=UTC"
$env:SPRING_DATASOURCE_USERNAME = "..."
$env:SPRING_DATASOURCE_PASSWORD = "..."
$env:DREAMSPEX_JWT_SECRET = "a-local-secret-with-at-least-32-characters"
$env:DREAMSPEX_OTP_SECRET = "another-local-secret-with-at-least-32-characters"
$env:MAIL_HOST = "smtp.gmail.com"
$env:MAIL_PORT = "587"
$env:MAIL_USERNAME = "your-gmail-address@gmail.com"
$env:MAIL_PASSWORD = "your-gmail-app-password"
$env:MAIL_FROM = "your-gmail-address@gmail.com"
mvn spring-boot:run
```

Flyway creates the identity tables and seeds role definitions only. It never creates a production user or logs OTP values. The API is available under `/api/v1`; OpenAPI UI is at `/swagger-ui.html`.

## Implemented Phase 2 foundation

- Java 21 and Spring Boot/Maven project
- Profile-based datasource and CORS configuration
- Flyway identity baseline
- Request correlation IDs and stable `application/problem+json` errors
- BCrypt password hashing
- Registration, login, registration OTP verification, password reset, refresh rotation, and logout endpoints
- JWT access tokens with role authorities and active-user checks
- Customer-only `/api/v1/auth/login` and dedicated `/api/v1/auth/admin/login` for `SUPER_ADMIN`
- OTP resend with a 30-second cooldown, attempt/resend limits, and pluggable delivery service
- Server-enforced `CUSTOMER` and `SUPER_ADMIN` authorization
- Customer profile and owned address CRUD under `/api/v1/me`
- Audit-log persistence for authentication events

The refresh token is currently accepted in the JSON request contract so the future frontend client can choose its storage policy. A production deployment should use an HttpOnly, Secure refresh cookie and enable CSRF protection for cookie-authenticated mutations.

OTP codes are stored as HMAC-SHA-256 values using `DREAMSPEX_OTP_SECRET`; if it is omitted, the JWT secret is used as a fallback. Configure a separate secret in deployed environments.

## Phase 1 endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login` (customer accounts only)
- `POST /api/v1/auth/admin/login` (Super Admin accounts only)
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/resend-otp`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET/PATCH /api/v1/me`
- `GET/POST/PATCH/DELETE /api/v1/me/addresses`
- `GET /api/v1/admin/session` (Super Admin authorization smoke endpoint)

The test profile uses a no-op OTP delivery adapter. Local, `prod`, and `production` profiles use Gmail SMTP and require `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM`; startup fails if the required mail configuration is missing. For Gmail, use an app password rather than an account password and enable STARTTLS on port 587. OTP values are never logged or returned by the API. Gmail delivery supports email identifiers; phone OTP requests require a separate SMS adapter.

At startup, the backend logs safe resolved SMTP diagnostics: active profile, host, port, whether username/password are configured, sender, whether username matches sender, the resolved JavaMailSender username, and whether SMTP authentication/STARTTLS are enabled. It never logs the password. Gmail App Password formatting spaces are removed before configuring JavaMail.

## Phase 2 endpoints

- `GET /api/v1/categories` and `GET /api/v1/categories/{slug}`
- `GET /api/v1/products` and `GET /api/v1/products/{id}`
- `GET /api/v1/offers`
- `POST /api/v1/coupons/validate` for customers
- `GET/POST/PATCH/DELETE /api/v1/cart` and `/api/v1/cart/items`
- `GET/POST/DELETE /api/v1/wishlist/items`
- `GET/POST/PATCH/DELETE /api/v1/admin/categories`
- `GET/POST/PATCH/DELETE /api/v1/admin/products`

Public product responses include variant availability and image metadata. Cart quantities are checked against available inventory (`quantity - reserved_quantity`) on the server. Checkout, order, payment, and Franchise Admin APIs are intentionally not included in Phase 2.

## Phase 3 endpoints

- `GET/POST/PATCH/DELETE /api/v1/prescriptions`
- `POST /api/v1/prescriptions/{id}/files`
- `GET /api/v1/prescriptions/files/{fileId}`
- `GET /api/v1/admin/prescriptions`
- `PATCH /api/v1/admin/prescriptions/{id}/review`
- Customer lens options at `GET /api/v1/prescriptions/lens-options` and `GET /api/v1/prescriptions/{id}/recommendations`
- SUPER_ADMIN lens option CRUD at `GET/POST /api/v1/admin/prescriptions/lens-options` and `PATCH/DELETE /api/v1/admin/prescriptions/lens-options/{id}`
- `GET /api/v1/membership-plans`
- `POST /api/v1/membership-plans/{id}/activate`
- `GET /api/v1/membership-plans/me/current`
- `GET/POST/PATCH/DELETE /api/v1/admin/membership-plans`
- `GET /api/v1/me/notifications`
- `POST /api/v1/me/notifications/{id}/read`

Prescription uploads use the local development filesystem adapter under the system temporary directory and store only metadata in MySQL. The adapter accepts JPEG, PNG, and PDF files up to 10 MB. Replace it with a managed storage adapter before non-local deployment. Memberships do not perform wallet, referral, or automatic renewal billing.

Lens option prices, availability, and display order are managed in the existing `lens_options` table. Customer responses omit unavailable or unpriced options; cart configuration and checkout validate the current server-side price and require re-selection when a cart price has changed. V18 adds display order and safely ensures the standard material option without modifying earlier migrations.

## Phase 4 endpoints

- `POST /api/v1/checkout/quote`
- `POST /api/v1/orders` with an `Idempotency-Key` header
- `GET /api/v1/orders`, `GET /api/v1/orders/{id}`, `POST /api/v1/orders/{id}/cancel`
- `POST /api/v1/payments/orders/{orderId}/intent`
- `GET /api/v1/payments/{id}`
- `POST /api/v1/payments/webhooks/razorpay`
- `GET /api/v1/admin/orders`, `PATCH /api/v1/admin/orders/{id}/status`
- `GET /api/v1/admin/payments`

Checkout recalculates prices, discounts, shipping, and stock on the server. Razorpay integration is test-mode structure only; no provider calls or real transactions are performed. Shipping is configurable with `DREAMSPEX_FREE_SHIPPING_THRESHOLD` and `DREAMSPEX_SHIPPING_CHARGE`.

Delivery availability is calculated on the server from the customer's saved address coordinates and the nearest active, configured store using Haversine straight-line distance. The Super Admin manages each store's latitude, longitude, and delivery radius under Admin Settings; active stores require a valid coordinate pair and a radius. `POST /api/v1/checkout/quote` includes availability, distance, and radius, while `POST /api/v1/orders` independently enforces the same rule and records the selected fulfilment store. PIN codes are not used to estimate serviceability. V34 adds nullable store delivery configuration and the order fulfilment-store association; existing stores must be configured before they can serve checkout.

## Phase 5 Super Admin operations

SUPER_ADMIN-only APIs include:

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/customers`, `PATCH /api/v1/admin/customers/{id}/status`
- `PATCH /api/v1/admin/inventory/{variantId}`
- `PATCH /api/v1/admin/products/{id}/status`
- Coupon CRUD under `/api/v1/admin/coupons`
- Customer notifications under `/api/v1/admin/customers/{id}/notifications`
- Audit search under `/api/v1/admin/audit-logs`
- Banner, homepage-content, store, and service CRUD under `/api/v1/admin`

V6 adds banner, homepage content, store, and service tables. All sensitive Phase 5 mutations record audit actions and revoke customer JWT versions when account status changes.

V7 aligns persisted Java `String` UUID and fixed-width string columns with Hibernate's `VARCHAR` mapping. It preserves rows, indexes, and foreign-key names while dropping and recreating only the affected foreign-key constraints during the type change. Run V7 through Flyway before starting with `ddl-auto=validate`.

V8 aligns numeric columns with their Java entity types: counters, quantities, inventory reservations, prescription axes, membership duration, file sizes, and the product-variant optimistic-lock version. It preserves existing data and constraints without table recreation.

V9 changes `refresh_tokens.token_hash` from the historical `CHAR(64)` to `VARCHAR(255)` to match the `String` mapping in `RefreshToken`. The existing unique constraint and index are preserved by the in-place column modification.
