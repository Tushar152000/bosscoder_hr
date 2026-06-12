'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Loader2,
  ExternalLink,
  Trash2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  uploadDocumentAction,
  deleteDocumentAction,
} from '@/app/(app)/settings/account/actions';
import type { DocumentType } from '@/lib/firestore/documents';
import { DOCUMENT_TYPES } from '@/lib/documents-config';

export { DOCUMENT_TYPES };

export interface DocumentRecord {
  docType: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: string | null;
}

interface Props {
  initialDocs: DocumentRecord[];
}

export function DocumentsSection({ initialDocs }: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentRecord[]>(initialDocs);
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [deleting, setDeleting] = useState<DocumentType | null>(null);
  const [errors, setErrors] = useState<Partial<Record<DocumentType, string>>>({});
  const inputRefs = useRef<Partial<Record<DocumentType, HTMLInputElement | null>>>({});

  async function handleUpload(docType: DocumentType, file: File) {
    setErrors((e) => ({ ...e, [docType]: undefined }));

    if (file.size > 10 * 1024 * 1024) {
      setErrors((e) => ({ ...e, [docType]: 'File too large — max 10 MB' }));
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setErrors((e) => ({ ...e, [docType]: 'Only JPG, PNG, WEBP or PDF allowed' }));
      return;
    }

    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', file);

    setUploading(docType);
    try {
      const result = await uploadDocumentAction(formData);
      setDocs((prev) => {
        const next = prev.filter((d) => d.docType !== docType);
        next.push({
          docType,
          fileName: file.name,
          fileUrl: result.url,
          uploadedAt: new Date().toISOString(),
        });
        return next;
      });
      router.refresh();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [docType]: err instanceof Error ? err.message : 'Upload failed',
      }));
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(docType: DocumentType) {
    setErrors((e) => ({ ...e, [docType]: undefined }));
    setDeleting(docType);
    const formData = new FormData();
    formData.append('docType', docType);
    try {
      await deleteDocumentAction(formData);
      setDocs((prev) => prev.filter((d) => d.docType !== docType));
      router.refresh();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [docType]: err instanceof Error ? err.message : 'Delete failed',
      }));
    } finally {
      setDeleting(null);
    }
  }

  const requiredTypes = DOCUMENT_TYPES.filter((d) => !d.optional);
  const optionalTypes = DOCUMENT_TYPES.filter((d) => d.optional);

  function renderDocRow(key: DocumentType, label: string, hint: string) {
    const uploaded = docs.find((d) => d.docType === key);
    const isUploading = uploading === key;
    const isDeleting = deleting === key;
    const busy = isUploading || isDeleting;

    return (
      <div
        key={key}
        className="px-4 md:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      >
        {/* Left: icon + label */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`mt-0.5 shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
              uploaded ? 'bg-emerald-50' : 'bg-slate-100'
            }`}
          >
            {uploaded ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-slate-800">{label}</p>
            {uploaded ? (
              <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-[200px]">
                {uploaded.fileName}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>
            )}
            {errors[key] && (
              <p className="text-[11px] text-red-600 mt-1">{errors[key]}</p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0 ml-10 sm:ml-0">
          {uploaded && (
            <>
              <a
                href={uploaded.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0C447C] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View
              </a>
              <button
                type="button"
                onClick={() => handleDelete(key)}
                disabled={busy}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-red-500 hover:text-red-700 disabled:opacity-40"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isDeleting ? 'Removing…' : 'Remove'}
              </button>
            </>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => inputRefs.current[key]?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                {uploaded ? 'Replace' : 'Upload'}
              </>
            )}
          </button>

          <input
            ref={(el) => {
              inputRefs.current[key] = el;
            }}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="sr-only"
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(key, file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-slate-100">
        <p className="text-[13px] font-semibold text-slate-700">Documents</p>
        <p className="text-[12px] text-slate-400 mt-0.5">
          Upload your identity and education documents. JPG, PNG, WEBP or PDF · max 10 MB each.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {requiredTypes.map(({ key, label, hint }) => renderDocRow(key, label, hint))}
      </div>

      {/* Optional documents group */}
      <div className="border-t border-slate-100">
        <div className="px-4 md:px-5 py-2.5 bg-slate-50 flex items-center gap-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Optional Documents
          </p>
          <span className="text-[10px] text-slate-400">· upload if available</span>
        </div>
        <div className="divide-y divide-slate-100">
          {optionalTypes.map(({ key, label, hint }) => renderDocRow(key, label, hint))}
        </div>
      </div>
    </section>
  );
}
