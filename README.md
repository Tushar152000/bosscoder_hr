# Bosscoder Workspace

Internal employee portal for Bosscoder Academy — `hr.bosscoderacademy.com` (production target).

Built as a closed system: only `@bosscoderacademy.com` Google accounts can sign in, sensitive fields are encrypted at the application layer, every privileged action is audit-logged, and production access will sit behind Identity-Aware Proxy.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **Firebase Auth** — Google SSO, domain-restricted to `@bosscoderacademy.com`
- **Firestore** — shared with `bosscoder_website` under the `bosscoderplatformindia` project, namespaced as `hr_*` collections
- **AES-256-GCM** field-level encryption (KMS-swappable)
- **Cloud Run + IAP** for production deployment (configured later)

## v1 feature scope

1. Employee directory + org tree
2. Performance evaluation (monthly / quarterly cycles, self + manager reviews up the org tree)
3. Offer letter generator (template-based, PDF, encrypted storage)
4. Admin essentials — audit log viewer, role/permission management, notifications

> See [PLAN.md](./PLAN.md) for the data model and build phases.

## Local setup

### 1. Install

```bash
cd bosscoder_hr
npm install
```

### 2. Get the Firebase service account

You already have one for `bosscoder_website`. **Reuse it** — same Firebase project.

```bash
# From the bosscoder_website .env.local, copy the FIREBASE_SERVICE_ACCOUNT value
# (it's already base64-encoded). You'll paste it into bosscoder_hr/.env.local below.
```

If you need a fresh one: Firebase Console → Project Settings → Service Accounts → Generate new private key → base64 the JSON:

```bash
cat ~/Downloads/service-account.json | base64 | pbcopy
```

### 3. Generate the field-encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **Don't lose this key.** Anything encrypted with it (salaries, offer letter terms, bank details) becomes unreadable if the key changes. For production we'll wrap it with Cloud KMS.

### 4. Create `.env.local`

```bash
cp .env.local.example .env.local
```

Fill in:
- `FIREBASE_SERVICE_ACCOUNT` — the base64 string from step 2
- `HR_ENCRYPTION_KEY` — the base64 key from step 3

The Firebase public config and `FOUNDER_EMAILS=pavitra.lalwani@bosscoderacademy.com` are pre-filled.

### 5. Enable Google sign-in for the Firebase project (if not already)

Firebase Console → Authentication → Sign-in method → **Google** → Enable.
Authorized domains should already include `localhost`.

### 6. Run

```bash
npm run dev
```

App runs on http://localhost:3100 (port 3100 to avoid colliding with `bosscoder_website` on 3000).

### 7. First sign-in

1. Visit http://localhost:3100 → redirected to `/login`
2. Click **Continue with Google**, pick your `@bosscoderacademy.com` account
3. On first login, the system reads `FOUNDER_EMAILS` from your env and bootstraps you with the `founder` role + all permissions
4. You land on `/dashboard` and can see the full sidebar (Directory, Performance, Offers, Roles, Audit Log, Settings)

The session is a Firebase session cookie (HTTP-only, 5-day expiry).

## How auth + roles work

```
┌──────────────┐    1. signInWithPopup       ┌──────────────────┐
│   Browser    │ ──────────────────────────► │ Firebase Auth    │
│              │ ◄────── ID token ────────── │ (Google OAuth)   │
└──────┬───────┘                              └──────────────────┘
       │ 2. POST /api/auth/session { idToken }
       ▼
┌──────────────────────────────────────────────────────────────────┐
│ Next.js server route (Node runtime, firebase-admin)              │
│  a. verifyIdToken                                                │
│  b. reject if email domain ∉ ALLOWED_AUTH_DOMAINS                │
│  c. ensureUserAndSyncClaims():                                   │
│       - first login + email ∈ FOUNDER_EMAILS → roles=['founder'] │
│       - else                                  → roles=['employee']│
│       - writes hr_users/{uid} doc                                │
│       - sets custom claims { hr, roles, perms } on the Auth user │
│  d. mints session cookie (5 days), HttpOnly                      │
└──────────────────────────────────────────────────────────────────┘
```

Roles live in two places:
- **Firestore `hr_users/{uid}`** — source of truth, edited via the upcoming Roles Admin UI
- **Custom claims** — fast read on every request via the session cookie

When roles change, call `syncCustomClaimsFromFirestore(uid)` to push them back into claims (the user's next session refresh picks them up).

## Encryption model

| Field type | Where encrypted | Key |
|---|---|---|
| Salary, bank, PAN/Aadhaar, address, DOB, perf notes, offer terms | Application layer (server-only) | `HR_ENCRYPTION_KEY` (local) → KMS-wrapped DEK (prod) |
| Everything else at rest | Firestore CMEK (production) | Customer KMS key |
| In transit | TLS | — |

Encrypted fields are stored as `{ v, iv, ct, tag }` and are **not searchable** in Firestore queries. See [src/lib/crypto/fields.ts](src/lib/crypto/fields.ts) for the canonical list.

## Audit logging

Every privileged action writes to `hr_audit_logs` (login, sensitive read, role change, review submit, offer create/send). The Audit Log page (`/admin/audit`) is visible to anyone with `view_audit_log` permission (founders + HR by default).

## Firestore data model (v1 target)

```
hr_users/{uid}                     ← portal users (auth identity + roles + perms)
hr_employees/{employeeId}          ← employee profiles (sensitive fields encrypted)
hr_teams/{teamId}                  ← team metadata (name, leadId, parentTeamId)
hr_permissions/{uid}               ← per-user permission overrides (optional)
hr_review_cycles/{cycleId}         ← review windows (Q1 2026, etc.)
hr_review_forms/{formId}           ← form templates (questions, scales, weights)
hr_review_submissions/{subId}      ← one per (reviewer × subject × cycle); status=draft/submitted/locked
hr_offer_templates/{templateId}    ← markdown/HTML templates with {{placeholders}}
hr_offer_letters/{offerId}         ← issued offers (compensation encrypted, PDF in Storage)
hr_notifications/{notificationId}  ← in-app + email reminders
hr_audit_logs/{entryId}            ← append-only event log
```

See [PLAN.md](./PLAN.md) for the field-level schema.

## Security rules

`firestore.rules` denies **all** client access to `hr_*` collections. Every read/write is server-mediated through Next.js API routes / Server Components using the Admin SDK.

> **Important:** when you deploy these rules, *merge* them with the existing `bosscoder_website` rules — don't replace them. Both live in the same project.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server on :3100 |
| `npm run build` | Production build |
| `npm run start` | Production server on :3100 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Deployment (later)

Cloud Run + Identity-Aware Proxy in front, Cloud SQL not used (Firestore-only), CMEK on Firestore, KMS-wrapped DEK for field encryption. Configured at the end of v1 build-out.

## Repo layout

```
src/
├── app/
│   ├── (app)/                  ← authenticated routes (sidebar + topbar layout)
│   │   ├── dashboard/
│   │   ├── directory/
│   │   ├── performance/
│   │   ├── offers/
│   │   ├── admin/{roles,audit}/
│   │   └── settings/
│   ├── api/auth/{session,logout}/route.ts
│   ├── login/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── auth/login-button.tsx
│   ├── layout/{sidebar,topbar}.tsx
│   └── ui/button.tsx
├── lib/
│   ├── auth/{roles,claims,session,guard}.ts
│   ├── crypto/{encrypt,fields}.ts
│   ├── firebase/{client,admin,collections}.ts
│   ├── audit.ts
│   └── utils.ts
└── middleware.ts
```
