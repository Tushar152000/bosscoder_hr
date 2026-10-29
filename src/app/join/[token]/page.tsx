import type { Metadata } from 'next';
import { CheckCircle2, Clock, LinkIcon } from 'lucide-react';
import { findByToken } from '@/lib/firestore/onboarding';
import { getEmployeeFull } from '@/lib/firestore/employees';
import { getIdDocuments } from '@/lib/firestore/documents';
import { documentOwnerKey } from '@/lib/documents-config';
import { answersFromEmployee } from '@/lib/onboarding/answers';
import { OnboardingWizard, type UploadedDoc } from '@/components/onboarding/onboarding-wizard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Onboarding form',
  // The token is in the URL — never send it on to another site.
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

/** A new joiner's onboarding form, opened from the link HR sent. No sign-in. */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await findByToken(token);

  if (!found.ok) {
    return (
      <Shell>
        <Notice
          icon={<LinkIcon className="h-6 w-6 text-slate-700" />}
          title={found.reason === 'expired' ? 'This link has expired' : "This link doesn't work"}
          body="It may have expired or been replaced by a newer one. Ask HR to send you a new onboarding link."
        />
      </Shell>
    );
  }

  const { record } = found;
  const employee = await getEmployeeFull(record.employeeId);
  if (!employee) {
    return (
      <Shell>
        <Notice icon={<LinkIcon className="h-6 w-6 text-slate-700" />} title="This link doesn't work" body="Ask HR to send you a new onboarding link." />
      </Shell>
    );
  }

  const first = employee.displayName.split(' ')[0] || employee.displayName;
  if (record.status === 'submitted') {
    return (
      <Shell>
        <Notice
          icon={<Clock className="h-6 w-6 text-[#0C447C]" />}
          title={`Thanks, ${first} — your form is submitted`}
          body="HR is checking your details. If anything needs changing, you'll get an email with this link."
        />
      </Shell>
    );
  }
  if (record.status === 'verified') {
    return (
      <Shell>
        <Notice
          icon={<CheckCircle2 className="h-6 w-6 text-[#0F6E56]" />}
          title="Your onboarding is complete"
          body="HR has verified your details. Nothing more to do here."
        />
      </Shell>
    );
  }

  const docs = await getIdDocuments(documentOwnerKey(employee));
  const uploaded: UploadedDoc[] = docs.map((d) => ({
    docType: d.docType,
    fileName: d.fileName,
    contentType: d.contentType,
    href: `/api/join/${token}/${d.docType}?v=${d.uploadedAt ? Date.parse(d.uploadedAt) : 0}`,
  }));

  return (
    <Shell>
      <OnboardingWizard
        token={token}
        name={employee.displayName}
        designation={employee.designation}
        workEmail={employee.email}
        initial={answersFromEmployee(employee, { noUan: record.noUan, firstJob: record.firstJob })}
        uploaded={uploaded}
        hrNote={record.status === 'changes_requested' ? record.hrNote : null}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bosscoder-logo.svg" alt="Bosscoder" className="h-6 w-auto" />
          <span className="ml-auto text-[12px] text-slate-800">Onboarding</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</main>
    </div>
  );
}

function Notice({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200/70 bg-white p-8 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-50">{icon}</div>
      <h1 className="text-[17px] font-semibold text-slate-950">{title}</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-800">{body}</p>
    </div>
  );
}
