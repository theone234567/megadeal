"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PLATFORM_SETTINGS,
  SETTING_LABELS,
  SETTING_LIMITS,
  diffPlatformSettings,
  formatSettingValue,
  parsePlatformSettings,
  settingImpacts,
  type PlatformSettings,
  type SettingChange,
} from "@/lib/platformSettingsRules";

interface HistoryEntry {
  version: number;
  at: string;
  by: string;
  changes: SettingChange[];
}

interface Loaded {
  version: number;
  settings: PlatformSettings;
  updatedAt: string | null;
  isDefault: boolean;
  launched: boolean;
  history: HistoryEntry[];
}

type NumberKey = "everydayCredits" | "flashCredits" | "everydayMaxDays" | "flashMaxHours";
const NUMBER_KEYS: NumberKey[] = ["everydayCredits", "flashCredits", "everydayMaxDays", "flashMaxHours"];

/**
 * Admin dashboard → Platform settings. Every switch here is enforced on
 * the server (app/api/deals/create); there are no switches for things the
 * site can't do yet. Public visibility is the launch switch in code, shown
 * read-only. Changes are confirmed in plain English before they're saved,
 * and every save is recorded in the change history.
 */
export default function PlatformSettingsPanel() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  // Number boxes hold text while being typed in, so an empty box or "1"
  // on the way to "12" isn't forced into a number mid-edit.
  const [numbers, setNumbers] = useState<Record<NumberKey, string>>(() => numberText(DEFAULT_PLATFORM_SETTINGS));
  const [confirming, setConfirming] = useState<SettingChange[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ message: string; stale: boolean } | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const apply = useCallback((data: Loaded) => {
    setLoaded(data);
    setDraft(data.settings);
    setNumbers(numberText(data.settings));
    setConfirming(null);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/platform-settings", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.settings) throw new Error(data?.error || "Couldn't load the settings.");
      apply(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load the settings.");
    }
  }, [apply]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        {loadError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-red-600">{loadError}</p>
            <button onClick={load} className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Try again
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )}
      </div>
    );
  }

  // What the form says now, checked with the same rules the server uses.
  const typed = Object.fromEntries(
    NUMBER_KEYS.map((k) => [k, numbers[k].trim() === "" ? NaN : Number(numbers[k])]),
  );
  const { settings: next, errors } = parsePlatformSettings({ ...draft, ...typed }, loaded.settings);
  const changes = errors.length === 0 ? diffPlatformSettings(loaded.settings, next) : [];
  const dirty = errors.length > 0 || changes.length > 0;

  function setFlag(key: keyof PlatformSettings, value: boolean) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSavedNote(null);
    setConfirming(null);
  }
  function setNumber(key: NumberKey, value: string) {
    setNumbers((n) => ({ ...n, [key]: value }));
    setSavedNote(null);
    setConfirming(null);
  }
  function cancel() {
    if (!loaded) return;
    setDraft(loaded.settings);
    setNumbers(numberText(loaded.settings));
    setConfirming(null);
    setSaveError(null);
  }

  async function save() {
    if (!loaded) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: next, version: loaded.version }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.settings) {
        setSaveError({ message: data?.error || "Couldn't save the settings. Please try again.", stale: res.status === 409 });
        setConfirming(null);
        return;
      }
      apply(data);
      setSavedNote(
        `Saved. ${changes.length} change${changes.length === 1 ? "" : "s"} recorded in the history. It can take up to a minute to reach every part of the site.`,
      );
    } catch {
      setSaveError({ message: "Couldn't save the settings. Check your connection and try again.", stale: false });
      setConfirming(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Platform settings</h2>
          <p className="mt-0.5 text-sm text-slate-500">Control how deals are submitted, what they cost and how long they run.</p>
        </div>
        <p className="text-xs text-slate-500">
          {loaded.isDefault
            ? "Using the starting settings: nothing has been saved yet."
            : `Version ${loaded.version}${loaded.updatedAt ? `, saved ${formatWhen(loaded.updatedAt)}` : ""}`}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card title="Launch & publishing" intro="What the public sees and how new submissions are handled.">
          <Row
            label="Public deals visible"
            help={
              loaded.launched
                ? "On: MegaDeal is launched. This is set in the site code, not here."
                : "Off: the public sees Coming Soon. This is set in the site code at launch, not here."
            }
          >
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                loaded.launched ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}
            >
              {loaded.launched ? "On" : "Off"}
            </span>
          </Row>
          <Row
            label={SETTING_LABELS.acceptSubmissions}
            help={
              loaded.launched
                ? "Off: businesses can still build and save drafts, but can't submit them."
                : "Applies after launch. Until then businesses can only save drafts."
            }
          >
            <Switch id="acceptSubmissions" on={draft.acceptSubmissions} onChange={(v) => setFlag("acceptSubmissions", v)} />
          </Row>
          <Row
            label={SETTING_LABELS.requireApproval}
            help="Off: the automatic check may publish a clean deal from an approved business straight away."
          >
            <Switch id="requireApproval" on={draft.requireApproval} onChange={(v) => setFlag("requireApproval", v)} />
          </Row>
        </Card>

        <Card title="Deal types" intro="Which kinds of deal businesses can submit.">
          <Row label="Everyday deals" help="Off: no new Everyday deals can be submitted.">
            <Switch id="everydayEnabled" on={draft.everydayEnabled} onChange={(v) => setFlag("everydayEnabled", v)} />
          </Row>
          <Row label="Flash deals" help="Off: no new Flash deals can be submitted.">
            <Switch id="flashEnabled" on={draft.flashEnabled} onChange={(v) => setFlag("flashEnabled", v)} />
          </Row>
        </Card>

        <Card title="Credits & duration" intro="What each new deal costs and the longest run a business can choose.">
          <Row label={SETTING_LABELS.chargeCredits} help="Off: new submissions are free and no credits are taken.">
            <Switch id="chargeCredits" on={draft.chargeCredits} onChange={(v) => setFlag("chargeCredits", v)} />
          </Row>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <NumberField
              id="everydayCredits"
              label="Everyday deal cost"
              unit="credits"
              value={numbers.everydayCredits}
              min={SETTING_LIMITS.credits.min}
              max={SETTING_LIMITS.credits.max}
              disabled={!draft.chargeCredits}
              onChange={(v) => setNumber("everydayCredits", v)}
            />
            <NumberField
              id="flashCredits"
              label="Flash deal cost"
              unit="credits"
              value={numbers.flashCredits}
              min={SETTING_LIMITS.credits.min}
              max={SETTING_LIMITS.credits.max}
              disabled={!draft.chargeCredits}
              onChange={(v) => setNumber("flashCredits", v)}
            />
            <NumberField
              id="everydayMaxDays"
              label="Everyday maximum"
              unit="days"
              value={numbers.everydayMaxDays}
              min={SETTING_LIMITS.everydayMaxDays.min}
              max={SETTING_LIMITS.everydayMaxDays.max}
              onChange={(v) => setNumber("everydayMaxDays", v)}
            />
            <NumberField
              id="flashMaxHours"
              label="Flash maximum"
              unit="hours"
              value={numbers.flashMaxHours}
              min={SETTING_LIMITS.flashMaxHours.min}
              max={SETTING_LIMITS.flashMaxHours.max}
              onChange={(v) => setNumber("flashMaxHours", v)}
            />
          </div>
          <p className="text-xs text-slate-500">
            Runs can be shortened here, up to 30 days and 6 hours. Costs and runs apply to new submissions only.
          </p>
        </Card>

        <section className="rounded-xl border border-sky-100 bg-sky-50 p-4">
          <h3 className="text-sm font-extrabold text-slate-900">Important notes</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            <li>Launching doesn&apos;t publish drafts. Businesses submit them once MegaDeal is live.</li>
            <li>Turning a deal type off stops new submissions. Deals already live keep running to their end date.</li>
            <li>Withdrawn or turned-down deals return exactly what they were charged.</li>
            <li>Business credit balances aren&apos;t changed by anything on this page.</li>
          </ul>
        </section>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="mt-4 space-y-1 text-sm font-semibold text-red-700">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {confirming && (
        <div role="region" aria-labelledby="confirm-settings" className="mt-5 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <h3 id="confirm-settings" className="text-sm font-extrabold text-amber-900">
            Save {confirming.length} change{confirming.length === 1 ? "" : "s"}?
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-amber-900">
            {confirming.map((c) => (
              <li key={c.key}>
                <span className="font-bold">
                  {SETTING_LABELS[c.key]}: {formatSettingValue(c.key, c.from)} → {formatSettingValue(c.key, c.to)}.
                </span>{" "}
                {settingImpacts([c])[0] ?? ""}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm and save"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={saving}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {saveError && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-red-700">
          <p className="font-semibold">{saveError.message}</p>
          {saveError.stale && (
            <button onClick={load} className="rounded-full border border-red-200 px-4 py-1.5 font-bold hover:bg-red-50">
              Reload settings
            </button>
          )}
        </div>
      )}
      {savedNote && (
        <p role="status" className="mt-4 text-sm font-semibold text-emerald-700">
          {savedNote}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSavedNote(null);
            setConfirming(changes);
          }}
          disabled={!dirty || errors.length > 0 || saving || confirming !== null}
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save settings
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={!dirty || saving}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          aria-expanded={showHistory}
          aria-controls="settings-history"
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Change history{loaded.history.length > 0 ? ` (${loaded.history.length})` : ""}
        </button>
      </div>

      {showHistory && (
        <div id="settings-history" className="mt-4 rounded-xl border border-slate-200 p-4">
          {loaded.history.length === 0 ? (
            <p className="text-sm text-slate-500">No changes yet.</p>
          ) : (
            <ol className="space-y-3">
              {loaded.history.map((h) => (
                <li key={h.version} className="text-sm">
                  <p className="text-xs font-semibold text-slate-500">
                    Version {h.version} · {formatWhen(h.at)} · {h.by}
                  </p>
                  <ul className="mt-0.5 text-slate-700">
                    {h.changes.map((c) => (
                      <li key={c.key}>
                        {SETTING_LABELS[c.key] ?? c.key}: {formatSettingValue(c.key, c.from)} → {formatSettingValue(c.key, c.to)}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function numberText(s: PlatformSettings): Record<NumberKey, string> {
  return {
    everydayCredits: String(s.everydayCredits),
    flashCredits: String(s.flashCredits),
    everydayMaxDays: String(s.everydayMaxDays),
    flashMaxHours: String(s.flashMaxHours),
  };
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Card({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500">{intro}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{help}</p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function Switch({ id, on, onChange }: { id: keyof PlatformSettings; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={SETTING_LABELS[id]}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
        on ? "bg-brand-600" : "bg-slate-300"
      }`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
    </button>
  );
}

function NumberField({
  id,
  label,
  unit,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  id: NumberKey;
  label: string;
  unit: string;
  value: string;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={`ps-${id}`} className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </label>
      <div className={`flex items-center rounded-lg border border-slate-200 px-2.5 ${disabled ? "bg-slate-50" : "bg-white"}`}>
        <input
          id={`ps-${id}`}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent py-1.5 text-sm text-slate-900 outline-none disabled:text-slate-400"
        />
        <span className="pl-1 text-xs text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
