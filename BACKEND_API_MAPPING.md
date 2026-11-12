# Dream Spex Backend Phase 1 — REST API Mapping

Base URL: `${VITE_API_BASE_URL}/api/v1`. JSON uses ISO-8601 UTC timestamps and string IDs. All monetary values are decimal strings or documented numbers; the server is authoritative for totals. Examples are representative contracts, not existing frontend calls.

## Common response and error format

Success collections use `{ "items": [], "page": 1, "pageSize": 20, "total": 0 }`. Mutations return the resource or `{ "id": "...", "status": "..." }`.

```json
{
  "type": "https://api.dreamspex.in/problems/validation",
  "title": "Validation failed",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "message": "One or more fields are invalid.",
  "requestId": "req_123",
  "fieldErrors": [{ "field": "email", "message": "Must be a valid email." }]
}
```

Expected statuses: `400` malformed input, `401` unauthenticated/invalid token, `403` insufficient role or franchise scope, `404` missing/hidden resource, `409` duplicate/state conflict, `422` validation/business rule, `429` rate limit, `502` payment/provider failure.

## Authentication (10 endpoints)

| Method and endpoint | Role | Purpose and validation | Example request / response |
|---|---|---|---|
| `POST /auth/register` | Public | Name, email/phone, password >=12, consent; unique identifier | Req `{ "name":"Alicia V.","email":"a@example.com","phone":"+919900000000","password":"..." }`; Resp `{ "userId":"u1","verificationRequired":true,"channels":["EMAIL"] }` |
| `POST /auth/login` | Public | Identifier/password; rate limited | Req `{ "identifier":"a@example.com","password":"..." }`; Resp `{ "accessToken":"<short-lived>","expiresIn":900,"user":{"id":"u1","role":"CUSTOMER"} }` |
| `POST /auth/admin/login` | Public portal | Same plus requested admin portal; no open registration | Req `{ "identifier":"admin@...","password":"..." }`; Resp same with `SUPER_ADMIN` |
| `POST /auth/franchise/login` | Public portal | Same plus active franchise assignment | Req `{ "identifier":"hyd@...","password":"..." }`; Resp includes `franchiseId` |
| `POST /auth/verify-otp` | Public/challenge | Six digits, purpose, expiry, max attempts | Req `{ "challengeId":"c1","otp":"123456" }`; Resp `{ "verified":true }` |
| `POST /auth/resend-otp` | Public/challenge | Cooldown and rate limits | Req `{ "challengeId":"c1" }`; Resp `{ "sent":true,"retryAfterSeconds":30 }` |
| `POST /auth/forgot-password` | Public | Generic response shape; identifier validation | Req `{ "identifier":"a@example.com" }`; Resp `{ "accepted":true,"challengeId":"opaque-id" }` (the ID is opaque and OTP is delivered separately) |
| `POST /auth/reset-password` | Public/challenge | One-use challenge and password policy | Req `{ "challengeId":"c1","otp":"123456","newPassword":"..." }`; Resp `{ "reset":true,"accepted":true }` |
| `POST /auth/refresh`, `POST /auth/logout` | Authenticated/refresh | Rotate/revoke refresh token | Resp refresh `{ "accessToken":"...","expiresIn":900 }`; logout `{ "loggedOut":true }` |

## Catalog, search, categories, offers, and banners (9 endpoints)

| Method and endpoint | Role | Purpose and key validation | Example |
|---|---|---|---|
| `GET /categories` | Public | Active categories, sorted | Resp `{ "items":[{"id":"c1","name":"Frames","slug":"frames","imageUrl":"..."}] }` |
| `GET /categories/{slug}` | Public | Slug lookup | Resp category plus product count |
| `GET /products` | Public | `q`, category, brand, color, badge, frameShape, frameType, minPrice, maxPrice, sort, page, pageSize | Resp item includes `id`, `name`, `price`, `compareAtPrice`, variants, images, and `ratingSummary` (average, verified count, 1–5 distribution) |
| `GET /products/{id}` | Public | Published product detail | Resp product, variants, images, stock summary, and verified `ratingSummary` |
| `GET /products/{id}/variants` | Public | Variant/color/size/lens options | Resp `{ "items":[{"id":"v1","sku":"...","additionalPrice":"0.00"}] }` |
| `GET /products/{id}/reviews` | Public | Rating summary plus approved 4- and 5-star reviews for still-delivered, non-returned purchases | Resp `{ "summary":{"averageRating":4.5,"totalReviews":2,"distribution":{"1":0,"2":0,"3":1,"4":1,"5":0}},"reviews":[{"rating":4,"title":"...","content":"...","customerName":"...","submittedAt":"..."}] }` |
| `GET /offers` | Public | Active coupons/banners safe for public display | Resp `{ "items":[{"code":"LUXE20","discountLabel":"20% OFF"}] }` |
| `GET /banners?placement=HOME_HERO` | Public | Active time-windowed content | Resp banner list |

## Verified-purchase product reviews (6 endpoints)

The backend derives the customer from the authenticated principal and verifies the requested product against the order's product variants. Submission and edits are allowed only while the owned order is `DELIVERED` and the product has not been returned. The database enforces one review per customer, order, and product. Edits return the review to `PENDING`.

| Method and endpoint | Role | Purpose and key validation |
|---|---|---|
| `GET /me/orders/{orderId}/reviews` | `CUSTOMER` | Return purchased product details, eligibility, and any existing review for the caller's order. |
| `POST /me/orders/{orderId}/products/{productId}/reviews` | `CUSTOMER` | Submit a 1–5 rating, title, written feedback, and up to five HTTP(S) image URLs. Customer ID is never accepted from the request. |
| `PUT /me/product-reviews/{reviewId}` | `CUSTOMER` | Edit the caller's eligible review; editing resets moderation to `PENDING`. |
| `GET /products/{productId}/reviews` | Public | Return the aggregate plus only approved 4- and 5-star public comments. |
| `GET /admin/product-reviews` | `SUPER_ADMIN` | View every submission, including pending and lower-rated private feedback, with customer/order details and statistics. |
| `PATCH /admin/product-reviews/{reviewId}/moderation` | `SUPER_ADMIN` | Set status to `APPROVED`, `HIDDEN`, or `REJECTED`. Only approved 4- and 5-star reviews can be public. |

Product rating averages and the 1–5 distribution include every eligible, non-rejected verified-purchase review, including pending/hidden and 1–3-star feedback. Rejected reviews, non-delivered orders, and returned products are excluded from public aggregates. Lower ratings remain persisted and visible to Super Admins.

## Customer transactional SMS

Order/payment, delivery, delivery-OTP, and return/refund handlers enqueue customer SMS in the same transaction as the event. A background worker sends queued items and retries transient provider failures (up to eight attempts with backoff). The unique event key prevents duplicate outbox records when an existing event handler is retried. Delivery OTP SMS uses the existing generated OTP and expires from the queue when that OTP expires. Messages are sent only to a registered Indian mobile number with `phone_verified_at` set.

| Method and endpoint | Role | Purpose |
|---|---|---|
| `GET /admin/sms-notifications` | `SUPER_ADMIN` | Latest 500 SMS results with order number, masked mobile, event type, status, provider message ID, and timestamp. Message content and OTP values are never returned. |

Set `DREAMSPEX_SMS_PROVIDER=mock` for local development (the default); mock mode never contacts an SMS provider. To enable MSG91 in a deployment, set `DREAMSPEX_SMS_PROVIDER=msg91` and `DREAMSPEX_SMS_MSG91_AUTH_KEY` in the backend environment. Configure each `DREAMSPEX_SMS_TEMPLATES_<EVENT>` variable to that event's approved MSG91 Flow/DLT template ID. MSG91 templates must be registered and approved by the operator's Indian DLT operator; the request uses the registered template ID and positional `VAR1`/`VAR2`/`VAR3` values. Event variable order is: order events/payment (order number); delivery OTP (order number, OTP); return events (return number, order number); refunds (order number, amount, provider reference). The Flow endpoint can be overridden with `DREAMSPEX_SMS_MSG91_FLOW_URL`. Credentials are environment-only and must not be put in frontend or local committed configuration. Queued template values (including OTPs) are AES-GCM encrypted with the configured OTP secret, delivery-link secret, or JWT secret fallback; keep the selected secret stable while queued notifications exist.

Supported event template keys are `ORDER_PLACED`, `ORDER_CONFIRMED`, `PAYMENT_SUCCESSFUL`, `PAYMENT_FAILED`, `ORDER_SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERY_OTP`, `ORDER_DELIVERED`, `ORDER_CANCELLED`, `REFUND_INITIATED`, `REFUND_COMPLETED`, `RETURN_APPROVED`, and `RETURN_PICKUP_SCHEDULED`. Each `DREAMSPEX_SMS_TEMPLATES_<EVENT>` must point at the matching approved template; use the same variable positions when registering the templates with MSG91.

## Cart and wishlist (11 endpoints)

| Method and endpoint | Role | Purpose |
|---|---|---|
| `GET /cart` | Customer or anonymous token | Return authoritative cart |
| `POST /cart/items` | Customer/anonymous | Req `{ "variantId":"v1","quantity":1,"prescriptionId":"p1","lensConfiguration":{"type":"Single vision","material":"..."}}`; quantity positive, variant active |
| `PATCH /cart/items/{id}` | Customer/anonymous | Req `{ "quantity":2 }`; recheck stock |
| `DELETE /cart/items/{id}` | Customer/anonymous | Remove owned cart item |
| `DELETE /cart` | Customer/anonymous | Clear cart |
| `POST /cart/coupon` | Customer/anonymous | Req `{ "code":"LUXE20" }`; server checks dates, limits, subtotal |
| `DELETE /cart/coupon` | Customer/anonymous | Remove applied coupon |
| `POST /cart/merge` | Customer | Merge anonymous cart after login with stock revalidation |
| `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/{variantId}` | Customer | Unique user/variant; no price trusted from client |

## Delivery, checkout, orders, payments, and after-sales (15 endpoints)

### Implemented Phase A: normal-order route batches

These endpoints are implemented by the delivery batch module. Batch creation is limited to paid orders in `PROCESSING` with matching city, state, and postal code. The returned `deliveryOtps` are one-time values shown to Super Admin only; share each customer’s OTP separately and never include it in the driver link.

| Method and endpoint | Role / access | Purpose |
|---|---|---|
| `GET /admin/delivery/batches/eligible-orders?postalCode=&city=&includeAssigned=` | `SUPER_ADMIN` | List paid, processing orders; filter by postal code/city. Assigned orders are included only when explicitly requested for reassignment. |
| `GET /admin/delivery/batches` | `SUPER_ADMIN` | List only route batches with pending or failed orders requiring attention, with total, pending, delivered, and failed counts. Completed batch records remain available in database history. |
| `GET /admin/delivery/batches/{id}` | `SUPER_ADMIN` | View every batch order, customer/address details, delivery status history, and link availability without changing the batch. |
| `GET /admin/delivery/batches/{id}/active-link` | `SUPER_ADMIN` | Retrieve the existing link only while it is active and recoverable; does not create or rotate a link or OTP. |
| `POST /admin/delivery/batches` | `SUPER_ADMIN` | Create a same-route batch; request `{ "routeName":"Madhapur route","orderIds":["..."],"reassignActiveOrders":false }`. Returns one link and one unique OTP per order. |
| `POST /admin/delivery/batches/{id}/link` | `SUPER_ADMIN` | Revoke existing links and issue a new expiring link and fresh OTPs for unfinished orders. |
| `POST /admin/delivery/batches/{id}/orders/{orderId}/otp` | `SUPER_ADMIN` | Invalidate and replace only that unfinished order’s OTP; returns the new OTP once and does not rotate the batch link. |
| `POST /admin/delivery/batches/{id}/link/revoke` | `SUPER_ADMIN` | Revoke current links without closing the batch; a new link may be generated later. |
| `POST /admin/delivery/batches/{id}/revoke` | `SUPER_ADMIN` | Close the batch and revoke its links. |
| `GET /admin/returns/delivery-batches/{operationType}/eligible-requests?city=&state=&postalCode=` | `SUPER_ADMIN` | List unassigned approved/pickup-scheduled return requests or replacement requests in `REPLACEMENT_PROCESSING`, filtered by route. Types: `RETURN_PICKUP`, `REPLACEMENT_DELIVERY`. |
| `GET /admin/returns/delivery-batches/{operationType}` | `SUPER_ADMIN` | List only pickup or replacement delivery batches with pending or failed requests requiring attention, with independent request statuses and counts. Completed batch records remain available in database history. |
| `POST /admin/returns/delivery-batches/{operationType}` | `SUPER_ADMIN` | Create one same-route batch for selected request IDs; returns one link and one unique OTP per request. |
| `GET /admin/returns/delivery-batches/{operationType}/{id}` | `SUPER_ADMIN` | View linked requests and combined request/delivery status histories without changing delivery links or OTPs. |
| `GET /admin/returns/delivery-batches/{operationType}/{id}/active-link` | `SUPER_ADMIN` | Retrieve the current recoverable link without rotation. |
| `POST /admin/returns/delivery-batches/{operationType}/{id}/link` | `SUPER_ADMIN` | Revoke and replace the link; returns fresh OTPs only for unfinished requests. |
| `POST /admin/returns/delivery-batches/{operationType}/{id}/link/revoke` | `SUPER_ADMIN` | Revoke the current pickup/replacement route link. |
| `GET /delivery/batches/{token}` | High-entropy batch capability | Return only the delivery data and history for that batch. Response is `no-store`; token is never stored in plaintext. |
| `POST /delivery/batches/{token}/orders/{orderId}/status` | High-entropy batch capability | Update one order at a time: `PACKED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `FAILED_ATTEMPT`, or `DELIVERED`. Delivery requires that order’s valid, unused OTP. |

Links and OTPs expire after 72 hours. Delivery OTPs are independently HMAC-hashed and limited to five attempts. Plaintext OTPs are returned only from batch creation, explicit link regeneration, or explicit per-order OTP regeneration; list, detail, active-link, driver, URL, and status-history data do not contain OTPs. A lost OTP cannot be recovered; explicit regeneration invalidates the previous code, resets its attempt counter and expiry, and returns the fresh value once. Completed orders cannot receive new OTPs. Picking up advances the associated order to `SHIPPED`; OTP-confirmed delivery advances it to `DELIVERED`; each order history update and delivery event are committed together. These APIs do not invoke payment or refund operations. Driver batch-link responses include optional saved destination coordinates; coordinates are absent when the address snapshot predates GPS location capture.

Return pickup and replacement delivery batches use the same expiring hashed link, OTP hash, and public mobile batch endpoint. Pickup batches accept `APPROVED`/`PICKUP_SCHEDULED` requests and confirm pickup using that request's OTP; replacement batches accept `REPLACEMENT_PROCESSING` replacement requests and confirm delivery using that request's OTP. Delivery status/history lives in the delivery tables; neither pickup nor replacement delivery changes the return request, refund, replacement processing, or order status. Navigation uses the associated order's immutable address snapshot, including its coordinates when present.

Link tokens remain SHA-256 hashed for lookup and are also stored as authenticated AES-GCM ciphertext so an authenticated Super Admin can copy/share the current token after reloading the admin UI. Configure `DREAMSPEX_DELIVERY_LINK_ENCRYPTION_SECRET` with at least 32 bytes and keep it stable; it falls back to `DREAMSPEX_JWT_SECRET` for compatibility. Older active links created before ciphertext persistence cannot be recovered; explicitly regenerate them from batch details to revoke the old token and issue fresh OTPs.

| Method and endpoint | Role | Purpose and validation |
|---|---|---|
| `POST /delivery/availability` | Public/customer | Req `{ "postalCode":"500001","items":[{"variantId":"v1","quantity":1}] }`; validate format and live serviceability |
| `POST /checkout/quote` | Customer | Req address ID/snapshot, fulfillment method; returns server subtotal/discount/tax/shipping/total and expiry |
| `POST /orders` | Customer | Idempotency-Key required; creates order from cart/quote, reserves inventory; never accepts client total |
| `GET /orders` | Customer; admins scoped | Customer history; franchise sees authorized franchise orders; super admin filters |
| `GET /orders/{id}` | Owner/admin scope | Full order and status history |
| `POST /orders/{id}/cancel` | Customer/admin scope | Only allowed states; refund policy applied |
| `POST /orders/{id}/return-request` | Customer | Req reason/items; eligibility and window validation |
| `PATCH /admin/orders/{id}/status` | Super Admin | Req `{ "status":"SHIPPED","note":"..." }`; valid state transition, audit |
| `PATCH /franchise/orders/{id}/status` | Franchise Admin scoped | Same, only assigned franchise |
| `GET /orders/{id}/tracking` | Owner/admin scope | Carrier/tracking events if configured |
| `POST /payments/orders/{orderId}/intent` | Customer | Creates provider intent; amount from order; idempotent |
| `POST /payments/webhooks/{provider}` | Provider signature | Verify signature, update payment/order; no JWT required |
| `GET /payments/{id}` | Order owner/admin | Payment status, no secrets |
| `POST /after-sales/tickets` | Customer | Req order ID, type, message, attachments; persist only if scope approved |
| `GET /after-sales/tickets` | Customer/admin scope | List tickets |

COD still creates an order with `paymentStatus=PENDING` and must not be marked paid until fulfillment policy says so.

## Customer, addresses, prescriptions, and membership (19 endpoints)

| Method and endpoint | Role | Purpose |
|---|---|---|
| `GET /me`, `PATCH /me` | Customer/admin self | Profile update with email/phone verification rules |
| `GET /me/addresses`, `POST /me/addresses`, `PATCH /me/addresses/{id}`, `DELETE /me/addresses/{id}` | Customer | Validate postal/contact fields and optional paired coordinates (latitude -90 to 90, longitude -180 to 180); default uniqueness |
| `GET /me/prescriptions` | Customer | Own metadata only |
| `POST /prescriptions` | Customer | Manual values with eye/axis/PD validation |
| `POST /prescriptions/{id}/files` | Customer | Multipart, allow-list MIME, max size, malware scan, object storage |
| `POST /prescriptions/{id}/ocr` | Customer | Explicit OCR opt-in/provider; asynchronous status, never diagnostic |
| `GET /prescriptions/{id}` | Customer/order scope | Own or order-authorized prescription |
| `GET /membership-plans` | Public | Active plans/perks/prices |
| `POST /memberships/checkout` | Customer | Req `{ "planId":"mp1" }`; creates provider subscription intent |
| `POST /memberships/{id}/cancel` | Customer | Provider cancellation policy |
| `GET /me/membership` | Customer | Current membership |
| `POST /memberships/webhooks/{provider}` | Provider signature | Activate/renew/cancel after verified event |
| `GET /me/notifications`, `PATCH /me/notifications/{id}/read` | Customer | Notification list/read |
| `GET /me/wallet` | Customer | Read balance only until wallet scope is approved |

## Stores, content, franchise, and Super Admin (31 endpoints)

### Public stores and services

`GET /stores`, `GET /stores/{id}`, `GET /stores?postalCode=...`, `GET /services` — public active stores/services; validate bounded page/filter values.

The customer Store Locator uses the implemented `GET /api/v1/franchises` storefront endpoint. It returns active franchise-managed stores with public address, coordinates, store contact name/phone, opening hours, and available services; owner email and franchise-user data are excluded. Search and distance sorting are performed client-side.

`POST /api/v1/franchise-applications` — public validated franchise enquiry submission. Creates a pending application and returns its reference; it does not create an account or store. Active duplicate enquiries for the same contact and city return `409`.

### Super Admin

`GET/POST /admin/franchises`, `GET/PATCH /admin/franchises/{id}`, `POST /admin/franchises/{id}/activate`, `GET/POST/PATCH /admin/franchises/{id}/users`, `GET /admin/dashboard`, `GET /admin/reports`, `GET /admin/customers`, `GET /admin/users`, `PATCH /admin/users/{id}/status`, `GET/POST/PATCH /admin/products`, `GET/PATCH /admin/inventory`, `GET/PATCH /admin/settings`, `GET/POST/PATCH /admin/banners`.

The implemented franchise edit and status operation is `PATCH /api/v1/admin/franchises/{id}`; it is protected by the Super Admin role, updates the existing store record, and accepts `ACTIVE`, `INACTIVE`, or `SUSPENDED` status without deleting associated orders or inventory.

`GET /api/v1/admin/franchise-applications`, `GET /api/v1/admin/franchise-applications/{id}`, `PATCH /api/v1/admin/franchise-applications/{id}` — Super Admin-only enquiry review, status updates, and append-only internal notes. Status values are `PENDING`, `CONTACTED`, `UNDER_REVIEW`, `APPROVED`, and `REJECTED`; approval does not automatically create a franchise account or store.

All mutations validate unique codes/SKUs, status transitions, referenced records, and audit the actor. Product and inventory APIs must not permit destructive changes that invalidate historical orders.

### Franchise Admin

`GET /franchise/me`, `PATCH /franchise/me`, `GET /franchise/dashboard`, `GET/POST/PATCH /franchise/products`, `GET/PATCH /franchise/inventory`, `GET /franchise/orders`, `GET/PATCH /franchise/orders/{id}`, `GET /franchise/customers`, `GET /franchise/reports`.

Every repository query includes the resolved authorized `franchiseId`; request body franchise IDs are ignored or rejected when inconsistent.

## Endpoint count

The mapping contains **106 proposed endpoint operations** when grouped multi-method rows are expanded: authentication 10, catalog/content 9, cart/wishlist 11, delivery/checkout/orders/payments/after-sales 15, customer/prescription/membership 19, stores/services 5, Super Admin 24, and Franchise Admin 13. Counts will be finalized with product decisions for optional wallet, referral, contact/newsletter, service booking, and after-sales persistence.
