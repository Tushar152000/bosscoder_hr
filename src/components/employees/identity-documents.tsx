'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ImageOff, Upload } from 'lucide-react';
import { uploadEmployeeIdDocumentAction } from '@/app/(app)/directory/actions';
import { formatDate } from '@/lib/format';

export interface IdDocument {
  docType: 'aadhaar' | 'pan';
  href: string;
  contentType: string;
  fileName: string;
  uploadedAt: string | null;
}

const LABELS: Record<IdDocument['docType'], string> = { aadhaar: 'Aadhaar card', pan: 'PAN card' };
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

/**
 * Aadhaar / PAN pictures on an employee's profile and edit page. Files open
 * through the access-checked /api/documents route. HR can upload or replace them;
 * the employee can also upload their own (Settings → Account, or the onboarding link).
 */
export function IdentityDocuments({
  employeeId,
  docs,
  canUpload,
}: {
  employeeId: string;
  employeeName?: string;
  docs: IdDocument[];
  canUpload: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {(['aadhaar', 'pan'] as const).map((t) => (
        <DocTile
          key={t}
          docType={t}
          doc={docs.find((d) => d.docType === t) ?? null}
          employeeId={employeeId}
          canUpload={canUpload}
        />
      ))}
    </div>
  );
}

function DocTile({
  docType,
  doc,
  employeeId,
  canUpload,
}: {
  docType: IdDocument['docType'];
  doc: IdDocument | null;
  employeeId: string;
  canUpload: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const isImage = doc?.contentType.startsWith('image/');

  function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append('employeeId', employeeId);
    fd.append('docType', docType);
    fd.append('file', file);
    start(async () => {
      const res = await uploadEmployeeIdDocumentAction(fd).catch(() => ({ ok: false as const, error: 'Upload failed — max 6 MB.' }));
      if (!res.ok) { setError(res.error); return; }
      setBroken(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-slate-200/70 bg-[#FAFAF7] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">{LABELS[docType]}</p>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Upload className="h-3 w-3" />
              {pending ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
            </button>
          </>
        )}
      </div>

      {doc ? (
        <a href={doc.href} target="_blank" rel="noopener" className="group mt-2 block">
          <div className="flex h-36 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
            {isImage && !broken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doc.href}
                alt={LABELS[docType]}
                onError={() => setBroken(true)}
                className="h-full w-full object-contain transition group-hover:opacity-90"
              />
            ) : (
              <span className="flex flex-col items-center gap-1 text-slate-400">
                {isImage ? <ImageOff className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                <span className="text-[11px]">{isImage ? 'Preview unavailable' : 'PDF'}</span>
              </span>
            )}
          </div>
          <p className="mt-1.5 truncate text-[11px] text-slate-500 group-hover:text-[#0C447C]">
            {doc.fileName}
            {doc.uploadedAt && <span className="text-slate-400"> · {formatDate(new Date(doc.uploadedAt))}</span>}
          </p>
        </a>
      ) : (
        <div className="mt-2 flex h-36 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-[12px] text-slate-400">
          Not uploaded
        </div>
      )}
      {error && <p className="mt-1.5 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
