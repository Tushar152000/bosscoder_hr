# Bosscoder Workspace — Build Plan

## Phase status

- [x] **Phase 1** — Scaffold + auth + roles + encryption + audit log + UI shell
- [ ] **Phase 2** — Employee directory + org tree
- [ ] **Phase 3** — Audit log polish + notifications plumbing
- [ ] **Phase 4** — Performance evaluation
- [ ] **Phase 5** — Offer letter generator
- [ ] **Phase 6** — Cloud Run + IAP deployment

## Data model (target)

### `hr_users/{uid}` — portal identities

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `email` | string | from Google SSO |
| `displayName` | string \| null | |
| `photoURL` | string \| null | |
| `roles` | `Role[]` | `'founder' \| 'hr' \| 'manager' \| 'employee'` |
| `permissions` | `Permission[]` | derived from roles + per-user overrides |
| `employeeId` | string \| null | FK → `hr_employees`; null until linked |
| `active` | boolean | soft-delete |
| `createdAt`, `updatedAt`, `lastLoginAt` | timestamp | |

### `hr_employees/{employeeId}` — HR records

Public fields:
- `employeeId` (string), `userUid` (string \| null — link to portal user)
- `displayName`, `email`, `personalEmail`, `phone`
- `designation`, `department`, `teamId`, `managerId` (string \| null)
- `joiningDate`, `employmentType` (`'full-time' | 'intern' | 'contractor'`)
- `status` (`'active' | 'on-notice' | 'left'`), `exitDate`
- `active` (boolean)

Encrypted fields (see `lib/crypto/fields.ts`):
- `compensation.{ctc,salary,bonus}`, `bank.{accountNumber,ifsc,beneficiaryName}`
- `identity.{pan,aadhaar}`, `address.{line1,line2,city,state,pincode}`
- `dob`, `emergencyContact.{name,phone}`

### `hr_teams/{teamId}`

- `name`, `leadEmployeeId`, `parentTeamId` (string \| null), `description`

### `hr_permissions/{uid}` — per-user overrides (optional)

- `grants: Permission[]`, `revokes: Permission[]`
- Final permissions = (defaults from roles ∪ grants) − revokes

### `hr_review_cycles/{cycleId}`

- `name` ("Q1 2026"), `cadence` (`'monthly' | 'quarterly'`)
- `windowStart`, `windowEnd`, `status` (`'draft' | 'open' | 'closed'`)
- `formId` (FK → `hr_review_forms`)
- `assignmentMode` (`'all' | 'team' | 'custom'`), `assignedEmployeeIds: string[]`

### `hr_review_forms/{formId}` — templates

- `name`, `version`, `sections: { title, questions: [...] }[]`
- Question types: `rating-1-5`, `rating-1-10`, `text-short`, `text-long`, `multi-choice`
- Per-question: `weight`, `visibility` (`'self' | 'manager' | 'hr-only'`)

### `hr_review_submissions/{subId}` — one form instance

- `cycleId`, `formId`, `subjectEmployeeId` (the person being reviewed)
- `reviewerUid` (the person filling it out — could be self, direct manager, or skip-level)
- `kind` (`'self' | 'manager' | 'skip-level'`)
- `status` (`'not-started' | 'in-progress' | 'submitted' | 'locked'`)
- `answers: Record<questionId, value>` — encrypted per question if marked sensitive
- `submittedAt`, `lockedAt`

### `hr_offer_templates/{templateId}`

- `name`, `version`, `body` (HTML/Markdown with `{{placeholders}}`)
- `placeholders: string[]`, `requiredFields: string[]`

### `hr_offer_letters/{offerId}`

Public:
- `templateId`, `templateVersion`, `candidate.name`, `candidate.role`
- `joiningDate`, `status` (`'draft' | 'sent' | 'accepted' | 'declined' | 'archived'`)
- `createdBy` (uid), `createdAt`, `sentAt`, `respondedAt`

Encrypted:
- `candidate.email`, `candidate.phone`
- `compensation.{ctc,fixed,variable,joiningBonus,esops}`, `bankDetails`
- `pdfStoragePath` (path in Cloud Storage; the file itself is private + signed-URL access only)

### `hr_audit_logs/{entryId}`

- `actorUid`, `actorEmail`, `action`, `resource: { type, id }`, `metadata`, `at`

## Performance evaluation flow

```
HR opens cycle ──► system creates submissions:
  for each active employee E:
    + 1 self-review (reviewer=E, subject=E, kind='self')
    + 1 manager-review (reviewer=E.manager, subject=E, kind='manager')
    + 1 skip-level review (reviewer=E.manager.manager, subject=E, kind='skip-level')
       [skip if no skip-level exists]

Each reviewer sees only their assigned forms.
Submit → status='submitted' → audit logged → reviewee can see allowed sections.
HR closes cycle → all unsubmitted forms force-locked → final compensation deltas
recorded encrypted on hr_employees.
```

Edge cases:
- Founder with no manager → only self-review + peer reviews if HR enables them
- Recently joined (< N days into cycle) → opt-out flag on the assignment
- Employee on notice → HR can exclude

## Offer letter flow

```
HR picks template ──► fills candidate + comp fields ──►
preview rendered (Markdown → HTML) ──►
on "Generate":
  - server-side Puppeteer renders PDF
  - PDF uploaded to Cloud Storage at hr/offer-letters/{offerId}/{version}.pdf
  - Firestore record stores encrypted comp + storage path
  - signed URL emailed to candidate (24h expiry)
  - audit log entry created

Candidate accept/decline tracked manually in v1.
DocuSign integration deferred to v2.
```

## Out of scope for v1

Leave management, attendance, payroll, 360/peer reviews, OKRs, e-signing, asset tracking, onboarding checklist, announcements feed.
