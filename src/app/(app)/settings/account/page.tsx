import { requireUser } from '@/lib/auth/guard';
import { type Permission } from '@/lib/auth/roles';
import { getHrUser } from '@/lib/firestore/users';
import { getDocumentsForUser } from '@/lib/firestore/documents';
import { getEmployeeByUserUid } from '@/lib/firestore/employees';
import { UserCircle2 } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { AvatarUploader } from '@/components/settings/avatar-uploader';
import { DocumentsSection } from '@/components/settings/documents-section';
import { DobSection } from '@/components/settings/dob-section';
import type { DocumentRecord } from '@/components/settings/documents-section';

export const metadata = { title: 'Account · Settings' };

const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  manage_employees: 'Create, edit, and remove employees.',
  manage_review_cycles: 'Open, close, and configure evaluation cycles.',
  view_compensation: 'View salary, ESOPs, and bank details.',
  view_personal_documents: "View employees' personal documents (PAN, Aadhaar, address).",
  manage_offer_letters: 'Generate and revoke offer letters.',
  manage_roles: 'Assign roles and permissions to other users.',
  view_audit_log: 'View the platform audit log.',
};

const ROLE_LABELS: Record<string, string> = {
  founder: 'Founder',
  hr: 'HR',
  manager: 'Manager',
  employee: 'Employee',
};

export default async function AccountPage() {
  const user = await requireUser();
  const [hrUser, rawDocs, me] = await Promise.all([
    getHrUser(user.uid),
    getDocumentsForUser(user.uid),
    getEmployeeByUserUid(user.uid),
  ]);

  const photoURL = hrUser?.photoURL ?? user.photoURL;
  const displayName = user.displayName ?? user.email;

  // True only when the user has uploaded a custom photo via the app.
  // hrUser.photoURL is overwritten with the Google OAuth picture on every login,
  // so we distinguish by URL prefix: custom uploads go to Firebase Storage.
  const hasCustomPhoto = hrUser?.photoURL?.startsWith('https://storage.googleapis.com/') ?? false;

  const initialDocs: DocumentRecord[] = rawDocs.map((d) => ({
    docType: d.docType,
    fileName: d.fileName,
    fileUrl: d.fileUrl,
    uploadedAt: d.uploadedAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-slate-900">Account</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Your profile and platform access.</p>
      </div>

      {!hasCustomPhoto && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0 mt-0.5">
            <UserCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-sky-900">Add a profile photo</p>
            <p className="text-[12px] text-sky-700 mt-0.5 leading-relaxed">
              A photo helps your teammates recognise you across the directory and reviews.
              Click your avatar in the <span className="font-medium">Profile</span> section below to upload one.
            </p>
          </div>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-700">Profile</p>
        </div>
        <div className="px-4 md:px-5 py-4">
          <div className="flex items-center gap-3 mb-5">
            <AvatarUploader
              uid={user.uid}
              photoURL={photoURL}
              displayName={user.displayName}
              email={user.email}
            />
            <div className="min-w-0" >
              <p className="text-[15px] font-medium text-slate-900 truncate">{displayName}</p>
              <p className="text-[12px] text-slate-500 mt-0.5 truncate">{user.email}</p>
            </div>
          </div>

          <dl className="divide-y divide-slate-100">
            <ProfileRow label="Display name" value={displayName} />
            <ProfileRow label="Email" value={user.email} copyable />
          </dl>
        </div>
      </section>

      <DocumentsSection initialDocs={initialDocs} />

      {me && <DobSection dateOfBirth={me.dateOfBirth ?? null} />}

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-700">Roles</p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Assigned by HR or Founders. Contact them to request changes.
          </p>
        </div>
        <div className="px-4 md:px-5 py-4">
          {user.roles.length === 0 ? (
            <p className="text-[13px] text-slate-400">No roles assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#E6F1FB] text-[#0C447C] border border-[#C3D9EF]"
                >
                  {ROLE_LABELS[role] ?? role}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-700">Permissions</p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Derived from your roles. Read-only.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {user.permissions.length === 0 ? (
            <p className="px-4 md:px-5 py-4 text-[13px] text-slate-400">No extra permissions.</p>
          ) : (
            user.permissions.map((perm) => (
              <div key={perm} className="px-4 md:px-5 py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-slate-700 font-mono break-all">{perm}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {PERMISSION_DESCRIPTIONS[perm as Permission] ?? ''}
                  </p>
                </div>
                <span className="self-start shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Granted
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-0.5 sm:gap-4">
      <span className="text-[12px] text-slate-500 shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-800 sm:text-right min-w-0">
        <span className="break-all sm:truncate">{value}</span>
        {copyable && <CopyButton value={value} />}
      </span>
    </div>
  );
}
