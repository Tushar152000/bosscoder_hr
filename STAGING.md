# Staging runbook — `hr-staging.bosscoderacademy.com`

Mirrors the production setup in [DEPLOY.md](DEPLOY.md) but as a **separate Cloud Run service** so staging deployments never touch production traffic.

```
                Cloudflare DNS (CNAME, DNS only)
                        │
                        ▼
  hr-staging.bosscoderacademy.com  ──►  Cloud Run (asia-south1)
                                             │  service: bosscoder-hr-staging
                                             ├─ same secrets as prod
                                             ├─ APP_ENV=staging
                                             └─ same Firebase project
                                                (bosscoderplatformindia)
```

> **Data warning:** staging shares the same Firestore project as production.
> Real employee data is visible and mutations affect live records.
> Use it only for UI/flow testing — not load or destructive tests.

---

## 1. Prerequisites

Same as DEPLOY.md step 0 — `gcloud` authenticated, project set, APIs enabled.
The service account `bosscoder-hr-runner` from production is reused.

---

## 2. Deploy the staging Cloud Run service

Run this from the repo root. It creates a **new** service (`bosscoder-hr-staging`)
completely independent of `bosscoder-hr` (production).

```bash
gcloud run deploy bosscoder-hr-staging \
  --source=. \
  --region=asia-south1 \
  --service-account="bosscoder-hr-runner@bosscoderplatformindia.iam.gserviceaccount.com" \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=80 \
  --timeout=60 \
  --set-env-vars="ALLOWED_AUTH_DOMAINS=bosscoderacademy.com,FOUNDER_EMAILS=pavitra.lalwani@bosscoderacademy.com,APP_ENV=staging" \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT=hr-firebase-service-account:latest,HR_ENCRYPTION_KEY=hr-encryption-key:latest"
```

Key differences from production:
| Setting | Production | Staging |
|---|---|---|
| Service name | `bosscoder-hr` | `bosscoder-hr-staging` |
| `--max-instances` | 10 | 3 |
| `APP_ENV` | *(unset)* | `staging` |

First build: ~3–5 min. You get a URL like:
```
https://bosscoder-hr-staging-<hash>-el.a.run.app
```

Test on this URL before mapping the custom domain (same steps as DEPLOY.md §5).

---

## 3. Add the run.app URL to Firebase Auth

Firebase Console → Authentication → Settings → **Authorized domains** → Add:
```
bosscoder-hr-staging-<hash>-el.a.run.app
```

Sign in and verify the app works end-to-end before wiring DNS.

---

## 4. Map `hr-staging.bosscoderacademy.com`

```bash
gcloud beta run domain-mappings create \
  --service=bosscoder-hr-staging \
  --domain=hr-staging.bosscoderacademy.com \
  --region=asia-south1
```

This prints the DNS record — for a subdomain it will be:
```
hr-staging   CNAME   ghs.googlehosted.com.
```

### Add the CNAME at Cloudflare

1. Cloudflare dashboard → **bosscoderacademy.com → DNS → Records → Add record**
2. Fill in:
   | Field | Value |
   |---|---|
   | Type | `CNAME` |
   | Name | `hr-staging` |
   | Target | `ghs.googlehosted.com` |
   | Proxy status | **DNS only** (grey cloud ☁️) |
   | TTL | Auto |
3. Save.

> ⚠️ **Proxy status must be grey cloud (DNS only).** If it's orange (Proxied),
> Cloudflare terminates TLS itself and Cloud Run can never provision its
> Google-managed cert — the domain mapping will stay stuck on "Provisioning"
> indefinitely. Same rule applies to `hr.bosscoderacademy.com` in production.

DNS propagation: usually instant with Cloudflare. Cloud Run then auto-provisions a free TLS cert — takes 5–15 minutes.

Check readiness:
```bash
gcloud beta run domain-mappings describe \
  --domain=hr-staging.bosscoderacademy.com \
  --region=asia-south1
```

When `Status: Ready` → open `https://hr-staging.bosscoderacademy.com`.

---

## 5. Add the custom domain to Firebase Auth

Firebase Console → Authentication → Settings → **Authorized domains** → Add:
```
hr-staging.bosscoderacademy.com
```

---

## 6. Subsequent staging deploys

```bash
gcloud run deploy bosscoder-hr-staging --source=. --region=asia-south1
```

Production (`bosscoder-hr`) is untouched. The two services are fully independent —
you can deploy to staging as many times as you like without affecting prod.

---

## 7. Promoting staging → production

When staging looks good, deploy the same source to production:

```bash
# 1. Deploy to production
gcloud run deploy bosscoder-hr --source=. --region=asia-south1

# 2. Verify on hr.bosscoderacademy.com

# 3. Roll back if needed
gcloud run services update-traffic bosscoder-hr \
  --to-revisions=<prev-revision>=100 \
  --region=asia-south1
```

Find the previous revision name:
```bash
gcloud run revisions list --service=bosscoder-hr --region=asia-south1
```

---

## Quick reference

| What | Staging | Production |
|---|---|---|
| Cloud Run service | `bosscoder-hr-staging` | `bosscoder-hr` |
| Public URL | `https://hr-staging.bosscoderacademy.com` | `https://hr.bosscoderacademy.com` |
| Service account | same — `bosscoder-hr-runner@…` | same |
| Secrets | same — `hr-firebase-service-account`, `hr-encryption-key` | same |
| `APP_ENV` env var | `staging` | *(unset)* |
| Max instances | 3 | 10 |
| Firebase project | `bosscoderplatformindia` (shared) | `bosscoderplatformindia` |

Logs:
```bash
gcloud run services logs read bosscoder-hr-staging --region=asia-south1 --limit=50
```
