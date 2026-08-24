"use client";

import { useRef, useState } from "react";
import { fileToCompressedDataUrl } from "@/lib/imageUpload";

interface PhotoUploadFieldProps {
  label: string;
  currentUrl: string | null;
  warningText: string;
  disabled?: boolean;
  disabledText?: string;
  onConfirm: (dataUrl: string) => Promise<void>;
}

export default function PhotoUploadField({
  label,
  currentUrl,
  warningText,
  disabled,
  disabledText,
  onConfirm,
}: PhotoUploadFieldProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPending(dataUrl);
    } catch (err: any) {
      setError(err?.message || "Couldn't process that image.");
    }
  }

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(pending);
      setPending(null);
    } catch (err: any) {
      setError(err?.message || "Couldn't save that photo. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>

      <div className="mt-2 flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {(pending || currentUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending || currentUrl || ""}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">
              🖼️
            </div>
          )}
        </div>

        {disabled ? (
          <p className="text-sm text-slate-400">{disabledText}</p>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Choose photo…
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {pending && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">⚠️ {warningText}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={saving}
              className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm change"}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              disabled={saving}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
