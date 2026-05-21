import { requireUser } from '@/lib/auth/guard';
import { type Permission } from '@/lib/auth/roles';
import { getHrUser } from '@/lib/firestore/users';
import { CopyButton } from '@/components/ui/copy-button';
import { AvatarUploader } from '@/components/settings/avatar-uploader';

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
  const hrUser = await getHrUser(user.uid);
  const photoURL = hrUser?.photoURL ?? user.photoURL;
  const displayName = user.displayName ?? user.email;

  return (
    <div className="max-w-full space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-slate-900">Account</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Your profile and platform access.</p>
      </div>

  
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-700">Profile</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-4 mb-5">
            <AvatarUploader
              uid={user.uid}
              photoURL={photoURL}
              displayName={user.displayName}
              email={user.email}
            />
            <div>
              <p className="text-[15px] font-medium text-slate-900">{displayName}</p>
              <p className="text-[12px] text-slate-500 mt-0.5">{user.email}</p>
            </div>
          </div>

          <dl className="divide-y divide-slate-100">
            <ProfileRow label="Display name" value={displayName} />
            <ProfileRow label="Email" value={user.email} copyable />
          </dl>
        </div>
      </section>

     
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-700">Roles</p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Assigned by HR or Founders. Contact them to request changes.
          </p>
        </div>
        <div className="px-5 py-4">
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

      {/* Permissions card */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-700">Permissions</p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Derived from your roles. Read-only.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {user.permissions.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-slate-400">No extra permissions.</p>
          ) : (
            user.permissions.map((perm) => (
              <div key={perm} className="px-5 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-medium text-slate-700 font-mono">{perm}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {PERMISSION_DESCRIPTIONS[perm as Permission] ?? ''}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
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
    <div className="flex items-center justify-between py-2.5 gap-4">
      <span className="text-[12px] text-slate-500 shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-800 text-right min-w-0">
        <span className="truncate">{value}</span>
        {copyable && <CopyButton value={value} />}
      </span>
    </div>
  );
}
