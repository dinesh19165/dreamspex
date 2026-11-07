# Dream Spex Backend Phase 1 — Frontend Analysis

## Scope and evidence

This is a Phase 1 architecture document based on the React 19 + TypeScript + Vite source currently in `src/`. No frontend files, Spring Boot files, SQL migrations, or database tables were changed or created.

The application mounts `ThemeProvider`, `AuthProvider`, and `ShopProvider` in `src/main.tsx`. Routing is in `src/App.tsx`. There is no `fetch`, Axios, GraphQL, Supabase, Firebase, or backend client call in the application. The only external runtime integrations are Unsplash/Pexels media, WhatsApp, browser camera access, and MediaPipe assets.

## 1. Verified route and feature inventory

### Public storefront

| Route(s) | Verified UI | Backend implication |
|---|---|---|
| `/`, `/shop`, `/products` | Home composition, product listing, query-param category/brand/badge filters, price/color/frame filters, sort and pagination-like local slicing | Catalog, category, filter, and media APIs |
| `/product/:id`, `/products/:id` | Product detail, gallery image, rating summary, stock label, delivery PIN check, cart, wishlist, prescription and try-on links | Product, variant, stock, review-summary APIs |
| `/categories` | Eight static category cards and category product counts | Category API |
| `/offers` | Three coupon/offer cards and copy action | Public coupon/offer API |
| `/membership`, `/membership/checkout?plan=` | Three monthly plans, plan summary, demo payment step, no activation | Membership plan, purchase, payment APIs |
| `/referral` | Referral information/CTA UI; no referral persistence | Referral program API only if product requirements confirm it |
| `/services`, `/about`, `/contact`, `/faq`, policy routes | Content pages; contact and newsletter forms only show local confirmation | CMS/content endpoint and lead/newsletter endpoints are optional |
| `/franchise`, `/stores` | Franchise marketing page and store locator using static records | Public store/franchise API |

### Customer auth and account

| Route(s) | Verified behavior | Current status |
|---|---|---|
| `/login` | Customer login form | Uses demo credentials and locally selects `CUSTOMER` |
| `/register` | Name, email, phone, password form; OTP screen | `authService` waits and returns `{ok:true}`; no account is created |
| `/forgot-password` | Identifier, OTP, new password flow | OTP and reset are simulated |
| `/dashboard` | Account summary, hardcoded Platinum label, local wishlist/cart counts | Protected only by locally stored role |
| `/account`, `/profile` | Profile/settings form with local “saved” feedback | No persistence |
| `/orders`, `/my-orders` | Empty order state | No order data |
| `/wallet` | In-memory balance and add-money demo | No wallet or payment ledger |
| `/wishlist` | Add/remove and move to cart | Local storage only |

### Shopping and fulfillment

| Route(s) | Verified behavior | Current status |
|---|---|---|
| `/cart` | Quantity changes, removal, local subtotal, coupon calculation | Local storage only |
| `/checkout` | Name, email, address, PIN validation, coupon, navigation to payment | Explicitly does not save/send data |
| `/payment` | Card, UPI, net banking, COD selection | Explicitly no gateway, payment, or order |
| `/order-success`, `/orders/success` | Static confirmation page | No order identifier is created |
| `/order-tracking`, `/orders/:id` | Static tracking presentation | No tracking source |
| `/after-sales` | Service/after-sales form | No ticket is persisted |

### Prescription and try-on

| Route(s) | Verified behavior | Current status |
|---|---|---|
| `/prescription/:productId` | Lens type, material, coatings, manual right/left eye values, PD, upload preview, configured cart item | Upload is local; OCR returns `null`; data is embedded in local cart |
| `/virtual-try-on` | Camera permission, frame selection, local SVG overlay, photo input | MediaPipe runs in browser; no image/face data is sent to Dream Spex |

### Super Admin

Protected by `SuperAdminRoute`:

`/admin/dashboard`, `/admin/franchises`, `/admin/franchises/new`, `/admin/franchises/:id`, `/admin/franchises/:id/users`, `/admin/inventory`, `/admin/orders`, `/admin/products`, `/admin/customers`, `/admin/reports`, `/admin/users`, `/admin/profile`, `/admin/settings`.

The UI presents dashboard metrics, franchise CRUD-shaped screens, product/inventory/order/customer/user/report/settings screens, but imports all records from `src/data/franchiseData.ts`. Forms change local component state only. No persistence or authorization request exists.

### Franchise Admin

Protected by `FranchiseRoute`:

`/franchise/dashboard`, `/franchise/products`, `/franchise/products/new`, `/franchise/orders`, `/franchise/orders/:id`, `/franchise/customers`, `/franchise/inventory`, `/franchise/reports`, `/franchise/profile`.

The UI is scoped visually to a selected franchise, but current mock data and route guards do not enforce server-side tenant isolation.

## 2. State, storage, and data models found

### `AuthProvider`

- Imports `mockCustomerUser`, `mockFranchiseUsers`, and `mockSuperAdminUser`.
- Roles are `CUSTOMER`, `FRANCHISE_ADMIN`, and `SUPER_ADMIN`.
- Stores a serialized mock user under `dream-spex-auth-session`.
- Clears several legacy session/local storage keys on logout.
- Route guards inspect the local role; there is no token validation.

### `ShopProvider`

- Stores `dream-spex-cart`, `dream-spex-wishlist`, `dream-spex-delivery-pin`, `dream-spex-delivery-pin-validated`, and `dream-spex-coupon`.
- Cart items can include `quantity`, `configuredId`, manual `Prescription`, and `LensSelection`.
- Coupon totals are calculated in the browser.
- Delivery is hardcoded to PINs `500001`, `500032`, `560001`, `110001`, and `400001`.

### Other local state

`LocationSelector` stores `dream-spex-selected-location`. Theme is effectively always light. Wallet, forms, admin records, order history, contact, newsletter, and after-sales submissions are not persisted.

### Type/data evidence

- `src/data/mockData.ts`: 8 categories, 8 products, 3 membership plans, 3 reviews, and coupon cards.
- `src/data/franchiseData.ts`: franchise locations, franchises, products, orders, users, statistics, sales, registrations, and report data.
- `src/data/mockAuth.ts`: demo users and demo passwords.
- `src/types/index.ts`: product/category/membership/review/coupon, prescription/lens, franchise, order, and stats shapes.

## 3. Mock and incomplete functionality

### Mock or local-only

1. All authentication and role login.
2. Registration, OTP delivery/verification, resend, forgot password, and reset.
3. Product/category/membership/review/coupon/franchise/admin data.
4. Cart, wishlist, selected location, coupon, and delivery PIN.
5. Checkout details and payment selection.
6. Order success, order history, tracking, and wallet.
7. Admin/franchise CRUD, reports, inventory, and customer management.
8. Contact, newsletter, and after-sales forms.

### Incomplete or explicitly absent

1. `extractPrescription()` always returns `null`.
2. Prescription files never reach a storage service or order.
3. The payment gateway is not configured; no fake success should be retained in production.
4. Tax, shipping fees, inventory reservation, refunds, returns, and order fulfillment are not modeled in the frontend.
5. Customer profile/address persistence is absent.
6. Review submission is absent; only static review cards exist.
7. Notification delivery and audit history are absent.
8. Referral and wallet presentation exists, but no transaction or business rules exist.

## 4. Recommended boundaries

The backend should make the server authoritative for identity, prices, discounts, stock, totals, order state, payment state, prescriptions, membership state, and franchise scope. The browser may retain an anonymous cart, but authenticated cart/wishlist data should synchronize to the server.

Do not treat client totals, roles, coupon discounts, PIN validation, or local-storage auth as trusted input. The first integration should replace mock data incrementally: authentication, catalog, cart/wishlist, checkout/order, then admin/franchise and secondary flows.

## 5. Risks and open requirements

The following require product decisions before implementation:

- Payment provider and supported currencies/tax rules.
- Shipping carrier, delivery SLA, COD rules, cancellation/refund policy.
- Whether a product is globally catalogued, franchise-stocked, or both.
- Prescription file retention, access policy, OCR provider, and medical/privacy requirements.
- Membership renewal provider, cancellation, proration, and benefits enforcement.
- Review eligibility/moderation policy.
- Whether referrals and wallet are launch scope.
- Store operating hours, service booking, and lead/contact ownership.
- Object storage, CDN, email/SMS/WhatsApp OTP provider, and observability platform.

## 6. Phase 1 conclusion

The frontend is a broad, coherent UI prototype, not an API client. The proposed backend must establish the persistence and security foundation rather than mirror local mock state blindly. The target schema and contracts in the companion documents are intentionally explicit about verified features, optional features, and unresolved requirements.
