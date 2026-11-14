# Dream Spex staging deployment

This guide is for a temporary, free staging environment only. It does not configure production, copy production data, create cloud resources, or deploy the application.

## Proposed services

- **Backend:** Render web service using `backend/Dockerfile`, with `backend` as the Docker build context.
- **Database:** A separate, empty TiDB MySQL-compatible staging database.
- **Frontend:** Cloudflare Pages, build command `npm run build`, output directory `dist`.
- **API health check:** `GET /api/health`; this endpoint runs `SELECT 1`, so Render marks the service unhealthy if it cannot reach its database.

For Cloudflare Pages, build from the repository root. Set the frontend build variable `VITE_API_BASE_URL` to the staging backend origin only, for example `https://<staging-api-host>` (do not append `/api/v1`).

## Backend environment variables

Configure these only in the staging backend service. Do not copy production values.

| Variable | Required | Purpose / format |
|---|---:|---|
| `SPRING_PROFILES_ACTIVE` | Yes | Must be `staging`. There is no default staging profile. |
| `PORT` | Render-provided | Render's listener port; application defaults to `8080` when run outside Render. |
| `SPRING_DATASOURCE_URL` | Yes | TiDB staging JDBC URL using the provider's required TLS/CA options and UTC timezone. Use the provider's current connection instructions. |
| `SPRING_DATASOURCE_USERNAME` | Yes | Staging database user with schema/migration privileges. |
| `SPRING_DATASOURCE_PASSWORD` | Yes | Staging database password. |
| `DREAMSPEX_JWT_ISSUER` | Yes | HTTPS origin of the staging API. |
| `DREAMSPEX_JWT_SECRET` | Yes | New random secret, at least 32 bytes. |
| `DREAMSPEX_OTP_SECRET` | Yes | Separate new random secret, at least 32 bytes. |
| `DREAMSPEX_DELIVERY_LINK_ENCRYPTION_SECRET` | Yes | Separate new random secret, at least 32 bytes. |
| `DREAMSPEX_SMTP_ENCRYPTION_KEY` | Yes | Base64 encoding of exactly 32 random bytes; independent of all three authentication secrets. |
| `DREAMSPEX_CORS_ORIGINS` | Yes | Exact HTTPS Cloudflare Pages staging origin(s), comma-separated if explicitly needed. No wildcard, paths, query strings, or local origins. |
| `MAIL_HOST` | Yes | Staging SMTP host used for OTP mail. |
| `MAIL_PORT` | Yes | Staging SMTP port, typically `587`. |
| `MAIL_USERNAME` | Yes | Staging SMTP username. |
| `MAIL_PASSWORD` | Yes | Staging SMTP password or provider app password. |
| `MAIL_FROM` | Yes | Verified sender address for OTP emails. |
| `MAIL_FROM_NAME` | No | Optional sender display name; defaults to `Dream Spex`. |
| `DREAMSPEX_STORAGE_DIRECTORY` | Yes | Absolute path for prescription uploads inside the service container. |
| `DREAMSPEX_HOMEPAGE_IMAGES_DIRECTORY` | Yes | Absolute path for homepage and product images inside the service container; mount a persistent volume at this path. |
| `RAZORPAY_KEY_ID` | Payment testing only | Optional; if set, must be a Razorpay test key ID beginning `rzp_test_`. |
| `RAZORPAY_KEY_SECRET` | Payment testing only | Optional; set together with the test key ID. |
| `RAZORPAY_WEBHOOK_SECRET` | Payment testing only | Test-mode webhook secret only. Never use a live webhook secret. |

The staging profile fixes the provider to `RAZORPAY_TEST`, rejects non-test key IDs, and rejects configuring only one of the key ID/secret pair. Leave both credentials empty to keep gateway operations unavailable during staging.

The Docker image declares `/var/lib/dream-spex/homepage-images` as a volume and uses it by default. If `DREAMSPEX_HOMEPAGE_IMAGES_DIRECTORY` is overridden, mount a persistent volume at the configured path so uploaded images survive container replacement.

## Frontend environment variable

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_API_BASE_URL` | Yes | Staging backend HTTPS origin, without `/api/v1`; embedded in the frontend build. |
| `VITE_WHATSAPP_NUMBER` | No | Optional staging contact number. If omitted, the current frontend default is used. |

## Migration and data safety

The staging profile enables Flyway. Start with a newly provisioned, empty staging database; migrations V1–V35 run on backend startup. Do not point staging at a production database or import production data. Before relying on TiDB, validate all migrations against a fresh database on the selected TiDB cluster. In particular, V20 uses prepared dynamic DDL, and later migrations alter foreign keys and use check constraints; compatibility is not yet confirmed.

## Storage limitation

Prescription uploads and homepage media currently use local filesystem storage. Render's service filesystem is not guaranteed to persist across restarts or redeploys. The Docker image does not add a persistent disk or object-storage adapter. Treat these uploads as temporary and potentially lost; upload durability remains a blocker for meaningful staging of media or prescription workflows.

## Remaining staging blockers

- Provision and verify a separate TiDB staging database, then confirm TLS connectivity and the complete Flyway run.
- Decide on durable upload storage before testing flows that depend on uploaded prescriptions or homepage media.
- Configure and verify a staging SMTP sender and delivery.
- Supply fresh staging-only secrets and the exact Pages origin after the staging origins are known.
- Verify Razorpay test credentials/webhook behavior only if payment testing is approved.
