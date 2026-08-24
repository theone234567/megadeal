"use client";

import { useRef, useState } from "react";
import { uploadPhoto } from "@/lib/imageUpload";

interface PhotoUploadFieldProps {
  label: string;
  currentUrl: string | null;
  warningText: string;
  disabled?: boolean;
  disabledText?: string;
  onConfirm: (url: string) => Promise<void>;
}

export default function PhotoUploadField({
  label,
  currentUrl,
  warningText,
  disabled,
  disabledText,
  onConfirm,
}: PhotoUploadFieldProps) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function cancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  }

  async function confirm() {
    if (!pendingFile) return;
    setSaving(true);
    setError(null);
    try {
      const { url } = await uploadPhoto(pendingFile);
      await onConfirm(url);
      cancel();
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
          {(previewUrl || currentUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl || currentUrl || ""}
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

      {pendingFile && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">⚠️ {warningText}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={saving}
              className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Uploading…" : "Confirm change"}
            </button>
            <button
              type="button"
              onClick={cancel}
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
