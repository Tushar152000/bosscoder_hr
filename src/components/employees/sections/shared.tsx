import { Lock } from 'lucide-react';

export function EncryptionNotice() {
  return (
    <div className="flex items-start gap-2 bg-[#FAEEDA] border border-[#FAC775] rounded-md p-2.5 mb-4">
      <Lock size={13} className="text-[#854F0B] mt-0.5 shrink-0" />
      <p className="text-[11px] text-[#854F0B]">
        These values are encrypted before being sent to storage.
      </p>
    </div>
  );
}

export function NoPermissionCard({ noun }: { noun: string }) {
  return (
    <div className="bg-white border border-slate-200/70 rounded-xl p-8 text-center">
      <Lock size={20} className="text-slate-300 mx-auto mb-2" />
      <p className="text-[12px] text-slate-500">
        You don&apos;t have permission to view or edit {noun} fields.
      </p>
    </div>
  );
}
