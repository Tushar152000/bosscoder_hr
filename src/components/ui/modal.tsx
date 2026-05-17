'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Intent = 'default' | 'danger';

interface ConfirmOpts {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: Intent;
}
interface AlertOpts {
  title: string;
  body?: React.ReactNode;
  okLabel?: string;
  intent?: Intent;
}
interface PromptOpts {
  title: string;
  body?: React.ReactNode;
  /** If set, the dialog only resolves with the typed string when it === expected. */
  expected?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: Intent;
}

type DialogState =
  | null
  | ({ kind: 'confirm'; resolve: (b: boolean) => void } & ConfirmOpts)
  | ({ kind: 'alert'; resolve: () => void } & AlertOpts)
  | ({ kind: 'prompt'; resolve: (s: string | null) => void; value: string } & PromptOpts);

/**
 * Dialog hook. Returns three async functions and a `dialog` node to render
 * once in the component tree. Replaces native window.confirm/alert/prompt
 * with a themed, accessible modal.
 *
 *   const { confirm, alert, promptText, dialog } = useDialog();
 *   if (await confirm({ title: 'Sure?', intent: 'danger' })) { … }
 *   return <>{dialog}{rest}</>;
 */
export function useDialog() {
  const [state, setState] = useState<DialogState>(null);

  const close = useCallback((result: 'confirm' | 'cancel') => {
    setState((s) => {
      if (!s) return null;
      if (s.kind === 'confirm') s.resolve(result === 'confirm');
      else if (s.kind === 'alert') s.resolve();
      else s.resolve(result === 'confirm' ? s.value : null);
      return null;
    });
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        setState({ kind: 'confirm', resolve, ...opts });
      }),
    []
  );
  const alert = useCallback(
    (opts: AlertOpts) =>
      new Promise<void>((resolve) => {
        setState({ kind: 'alert', resolve, ...opts });
      }),
    []
  );
  const promptText = useCallback(
    (opts: PromptOpts) =>
      new Promise<string | null>((resolve) => {
        setState({ kind: 'prompt', resolve, value: '', ...opts });
      }),
    []
  );

  const setPromptValue = useCallback((v: string) => {
    setState((s) => (s && s.kind === 'prompt' ? { ...s, value: v } : s));
  }, []);

  const dialog = state ? (
    <DialogShell state={state} close={close} setPromptValue={setPromptValue} />
  ) : null;

  return { confirm, alert, promptText, dialog };
}

function DialogShell({
  state,
  close,
  setPromptValue,
}: {
  state: NonNullable<DialogState>;
  close: (r: 'confirm' | 'cancel') => void;
  setPromptValue: (v: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close('cancel');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (state.kind === 'prompt') inputRef.current?.focus();
    else confirmBtnRef.current?.focus();
  }, [state.kind]);

  if (typeof document === 'undefined') return null;

  const intent: Intent =
    state.kind === 'alert' ? state.intent ?? 'default' : (state as { intent?: Intent }).intent ?? 'default';
  const isDanger = intent === 'danger';

  const promptDisabled =
    state.kind === 'prompt' && state.expected !== undefined && state.value !== state.expected;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promptDisabled) close('confirm');
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => close('cancel')}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />
      <div
        ref={cardRef}
        className="relative w-full max-w-md rounded-xl border border-default bg-card-elevated shadow-2xl ring-1 ring-white/5"
      >
        <form onSubmit={onSubmit} className="p-5">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                isDanger
                  ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30'
                  : 'bg-accent-500/15 text-accent-200 ring-1 ring-accent-500/30'
              )}
            >
              {isDanger ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="dialog-title" className="text-base font-semibold text-white">
                {state.title}
              </h2>
              {state.body && (
                <div className="mt-1 text-sm text-muted">{state.body}</div>
              )}
              {state.kind === 'prompt' && (
                <div className="mt-3">
                  <Input
                    ref={inputRef}
                    value={state.value}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder={state.placeholder}
                    autoComplete="off"
                  />
                  {state.expected && (
                    <p className="mt-1.5 text-xs text-muted">
                      Type <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-white">{state.expected}</code> to confirm.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            {state.kind !== 'alert' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => close('cancel')}
              >
                {(state as ConfirmOpts | PromptOpts).cancelLabel ?? 'Cancel'}
              </Button>
            )}
            <Button
              ref={confirmBtnRef}
              type="submit"
              size="sm"
              variant={isDanger ? 'danger' : 'default'}
              disabled={promptDisabled}
            >
              {state.kind === 'alert'
                ? state.okLabel ?? 'OK'
                : (state as ConfirmOpts | PromptOpts).confirmLabel ?? 'Confirm'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
