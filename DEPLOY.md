# Deployment runbook — `hr.bosscoderacademy.com`

Target architecture:

```
                    Squarespace DNS (CNAME)
                            │
                            ▼
        hr.bosscoderacademy.com  ──►  Cloud Run (asia-south1)
                                          │
                                          ├─ env vars (public, runtime)
                                          ├─ Secret Manager:
                                          │    • hr-firebase-service-account
                                          │    • hr-encryption-key
                                          └─ Firebase Auth + Firestore
                                                (project: bosscoderplatformindia)
```

The app enforces domain-restricted Google sign-in server-side, so an
unauthenticated Cloud Run service is fine for v1. (Optional IAP layer at the
end of this doc.)

---

## 0. One-time prerequisites (5 minutes)

### Local tools
```bash
gcloud --version            # need >= 470
gcloud auth login
gcloud config set project bosscoderplatformindia
```

### Enable APIs
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com
```

### Region
We'll use **`asia-south1` (Mumbai)** throughout — best latency for India.

```bash
gcloud config set run/region asia-south1
```

---

## 1. Rotate the Firebase service account key (if you haven't)

Earlier in development your service account briefly sat in a committable file.
**Treat it as compromised** and rotate before going to production.

```bash
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Save the JSON locally (e.g. ~/Downloads/hr-svc.json), then:

base64 -i ~/Downloads/hr-svc.json | tr -d '\n' > /tmp/hr-svc.b64

# Quick decode sanity check:
cat /tmp/hr-svc.b64 | base64 -d | jq .project_id
# → "bosscoderplatformindia"
```

Also revoke any older keys you don't need:
Firebase Console → Project Settings → Service Accounts → **Manage service account permissions** → IAM → find `bosscoder-secure-key@…` → Keys tab → delete old.

If `bosscoder_website` uses the same key, update its env there too in the same maintenance window.

---

## 2. Generate the production encryption key

**Do not reuse the local-dev `HR_ENCRYPTION_KEY`** — production data shouldn't be decryptable with a key that's been in your laptop's `.env.local` and shell history.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" > /tmp/hr-encryption-key.b64
```

⚠️ **Back this up somewhere outside this repo** (a password manager). If you lose it, every encrypted field (salaries, bank, PAN/Aadhaar, offer letter terms) becomes ciphertext rubble.

---

## 3. Push secrets to Secret Manager

```bash
gcloud secrets create hr-firebase-service-account --replication-policy=automatic
gcloud secrets create hr-encryption-key --replication-policy=automatic

# Upload values
gcloud secrets versions add hr-firebase-service-account --data-file=/tmp/hr-svc.b64
gcloud secrets versions add hr-encryption-key --data-file=/tmp/hr-encryption-key.b64

# Wipe local copies
shred -u /tmp/hr-svc.b64 /tmp/hr-encryption-key.b64 ~/Downloads/hr-svc.json 2>/dev/null || \
  rm -f /tmp/hr-svc.b64 /tmp/hr-encryption-key.b64 ~/Downloads/hr-svc.json
```

---

## 4. Create a dedicated Cloud Run service account

Don't use the default Compute SA — give Cloud Run a least-privilege identity.

```bash
gcloud iam service-accounts create bosscoder-hr-runner \
  --display-name="Bosscoder Workspace Cloud Run service"

SA="bosscoder-hr-runner@bosscoderplatformindia.iam.gserviceaccount.com"

# Grant access to the two secrets only
gcloud secrets add-iam-policy-binding hr-firebase-service-account \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding hr-encryption-key \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor"
```

The service account doesn't need Firestore IAM — the app authenticates to Firestore via the service account JSON loaded from `FIREBASE_SERVICE_ACCOUNT`.

---

## 5. First deploy (build + run)

From `/Users/pavitralalwani/bosscoder_stuff/bosscoder_hr`:

```bash
gcloud run deploy bosscoder-hr \
  --source=. \
  --region=asia-south1 \
  --service-account="bosscoder-hr-runner@bosscoderplatformindia.iam.gserviceaccount.com" \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=60 \
  --set-env-vars="ALLOWED_AUTH_DOMAINS=bosscoderacademy.com,FOUNDER_EMAILS=pavitra.lalwani@bosscoderacademy.com" \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT=hr-firebase-service-account:latest,HR_ENCRYPTION_KEY=hr-encryption-key:latest"
```

> Edit `FOUNDER_EMAILS` to include Rajat and Manish (comma-separated, no spaces) before deploying — the env var is read on every login to bootstrap founders.

First build takes ~3–5 minutes. Subsequent deploys are ~90 seconds because Cloud Build caches layers.

When it finishes you'll get a URL like:
```
https://bosscoder-hr-<hash>-el.a.run.app
```

### Test on the run.app URL first

Before the custom domain is wired up, verify the deploy works:

1. **Add the run.app URL to Firebase Auth authorized domains:**
   Firebase Console → Authentication → Settings → **Authorized domains** → Add domain → paste `bosscoder-hr-<hash>-el.a.run.app` (just the hostname, no `https://`).
2. Open the URL in a browser. You should land on `/login`.
3. Sign in with your `@bosscoderacademy.com` account. You should land on `/dashboard` as a founder.
4. Quick sanity: open `/admin/audit` — you should see your `auth.login` entry. That confirms the service account → Firestore plumbing works in production.

If anything fails, view logs:
```bash
gcloud run services logs read bosscoder-hr --region=asia-south1 --limit=100
```

---

## 6. Map `hr.bosscoderacademy.com`

```bash
gcloud beta run domain-mappings create \
  --service=bosscoder-hr \
  --domain=hr.bosscoderacademy.com \
  --region=asia-south1
```

This prints DNS records you need to add. For a subdomain it'll be a single
**CNAME**:

```
hr   CNAME   ghs.googlehosted.com.
```

### Add the CNAME at Squarespace

1. Squarespace → **Settings → Domains → bosscoderacademy.com → DNS Settings** (or whatever they call it now — "Manage DNS")
2. Add a **CNAME** record:
   - Host: `hr`
   - Points to: `ghs.googlehosted.com`
   - TTL: leave default (or 300)
3. Save.

DNS propagation is usually 5–30 minutes. While you wait, Cloud Run provisions
a free Google-managed TLS cert — automatic.

Verify status:
```bash
gcloud beta run domain-mappings describe \
  --domain=hr.bosscoderacademy.com \
  --region=asia-south1
```

When `Status: Ready` → cert is live. Hit `https://hr.bosscoderacademy.com`.

---

## 7. Add the custom domain to Firebase Auth authorized domains

Firebase Console → Authentication → Settings → **Authorized domains** → Add `hr.bosscoderacademy.com`.

Without this, Google sign-in popup will fail with `auth/unauthorized-domain`.

---

## 8. Firestore — rules and indexes

**Important caveat:** the rules + indexes files in *this* repo only describe
the `hr_*` collections. `bosscoder_website` has its own rules + indexes file.
`firebase deploy` **replaces** the rules/indexes for the whole project — so
deploying from this repo would clobber the website's rules.

### Recommended: merge into `bosscoder_website`

Copy the `match /hr_*` blocks from this repo's [firestore.rules](firestore.rules)
into `bosscoder_website/firestore.rules`, and merge the index entries from this
repo's [firestore.indexes.json](firestore.indexes.json) into
`bosscoder_website/firestore.indexes.json`. Then deploy from there:

```bash
cd ../bosscoder_website
firebase deploy --only firestore:rules,firestore:indexes --project bosscoderplatformindia
```

### Alternative (one-shot path): use the `hr_` namespace exclusively

Since every `hr_*` collection is server-mediated through the Admin SDK (which
bypasses rules), the *worst case* of skipping the rules deploy is that someone
with a Firebase Auth account on the project could, in theory, read raw `hr_*`
docs via the client SDK. The encryption layer means salaries, bank etc. are
still ciphertext, but names, emails, and review answers would leak.

**Don't skip the rules deploy.** Go with the merge.

---

## 9. Subsequent deploys

```bash
cd /Users/pavitralalwani/bosscoder_stuff/bosscoder_hr
gcloud run deploy bosscoder-hr --source=. --region=asia-south1
```

Cloud Run keeps your env vars / secrets / SA bindings between deploys.

---

## 10. (Optional, do later) Identity-Aware Proxy

The current setup is "closed" at the application layer — Google sign-in is
domain-restricted, server-side enforced. For belt-and-suspenders network-level
gating (so unauth'd traffic can't even reach the Next.js process), put IAP in
front:

1. Move Cloud Run behind a global HTTPS Load Balancer.
2. Enable IAP on the LB backend.
3. In IAP settings, allow `domain:bosscoderacademy.com` in the access list.
4. Disable `--allow-unauthenticated` on the Cloud Run service.

This is a half-day of work and adds ~$20/mo for the LB. Most teams ship without it. Add when you have:
- Real production traffic
- A compliance review that asks for it

---

## Quick reference

| What | Where |
|---|---|
| Cloud Run service | `bosscoder-hr` in `asia-south1` |
| Service account | `bosscoder-hr-runner@bosscoderplatformindia.iam.gserviceaccount.com` |
| Secrets | `hr-firebase-service-account`, `hr-encryption-key` |
| Build context | This repo's root |
| Public domain | `https://hr.bosscoderacademy.com` |
| Logs | `gcloud run services logs read bosscoder-hr --region=asia-south1` |
| Roll back | `gcloud run services update-traffic bosscoder-hr --to-revisions=<rev>=100 --region=asia-south1` |

## Common breakage

**"Firebase: Error (auth/unauthorized-domain)" in the popup**
→ Step 7. Add the run.app URL *and* `hr.bosscoderacademy.com` to Firebase Auth authorized domains.

**500 on every page right after deploy**
→ Check logs. Usually `FIREBASE_SERVICE_ACCOUNT is not set` (secret mount missing) or invalid base64. Re-create the secret version.

**"FAILED_PRECONDITION: The query requires an index" in production**
→ Firestore index hasn't been deployed. Either click the auto-create URL in the error, or deploy indexes (Section 8).

**Cold start feels slow**
→ Set `--min-instances=1` (~$15/mo extra). The first request after idle would otherwise pay for a Node boot.

**Custom domain stuck on "provisioning" >1 hour**
→ DNS propagation. Re-check the CNAME at Squarespace; some DNS UIs strip the trailing `.` from `ghs.googlehosted.com.` — that's fine, but make sure it's not a typo.
