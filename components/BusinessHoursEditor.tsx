"use client";

import {
  TIME_OPTIONS,
  MAX_HOURS_EXCEPTIONS,
  emptySchedule,
  formatTime12h,
  nzToday,
  parseBusinessHours,
  serializeBusinessHours,
  type BusinessHoursData,
  type DaySchedule,
  type HoursException,
} from "@/lib/businessHours";

function TimeSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-400"
    >
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {formatTime12h(t)}
        </option>
      ))}
    </select>
  );
}

/**
 * Structured opening-hours editor: per day, closed/open toggle plus any
 * number of time ranges (lunch + dinner service is just two ranges on the
 * same day, not a special case). Stores its value as a JSON string in the
 * same `businessHours` field a plain-text description used to occupy.
 *
 * If the incoming value is old free text (pre-dating this editor) rather
 * than the JSON shape, it's carried over into the notes field so nothing
 * a business already wrote is lost — they just need to translate it into
 * the structured days/times once.
 */
export default function BusinessHoursEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (raw: string) => void;
}) {
  const parsed = parseBusinessHours(value);
  const data: BusinessHoursData = parsed ?? {
    schedule: emptySchedule(),
    notes: value && !parsed ? value : undefined,
  };

  function update(next: BusinessHoursData) {
    onChange(serializeBusinessHours(next));
  }

  function updateDay(index: number, day: DaySchedule) {
    const schedule = [...data.schedule];
    schedule[index] = day;
    update({ ...data, schedule });
  }

  // Dated exceptions. Past ones are dropped whenever the list is edited.
  const today = nzToday();
  const exceptions = (data.exceptions ?? []).filter((e) => e.date >= today);
  // Kept in the order they were added, so a row never jumps while it's
  // being edited; customers see them sorted (upcomingExceptions).
  function setExceptions(next: HoursException[]) {
    update({ ...data, exceptions: next.length > 0 ? next : undefined });
  }
  function updateException(index: number, e: HoursException) {
    const next = [...exceptions];
    next[index] = e;
    setExceptions(next);
  }

  function copyMondayToWeekdays() {
    const monday = data.schedule[0];
    const schedule = data.schedule.map((d, i) =>
      i >= 1 && i <= 4 ? { ...monday, day: d.day } : d
    );
    update({ ...data, schedule });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <span className="text-sm font-bold text-slate-900">Opening hours</span>
        <button
          type="button"
          onClick={copyMondayToWeekdays}
          className="whitespace-nowrap text-xs font-semibold text-brand-600 hover:underline"
        >
          Copy Monday to Tue–Fri
        </button>
      </div>

      {/* Two columns from tablet width: seven full-width rows made the
          form far longer than it needed to be. */}
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {data.schedule.map((day, i) => (
          <div key={day.day} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
            <div className="flex items-center justify-between">
              <span className="w-10 text-sm font-semibold text-slate-700">{day.day}</span>
              {/* An "Open" switch, off by default, rather than a "Closed"
                  checkbox checked by default — a fresh schedule used to
                  show seven boxes all ticked "Closed", which read as the
                  business being shut every day rather than as a blank
                  template. Toggling the state merchants actually think
                  about first (which days they're open) is also the more
                  natural direction for a checkbox-shaped control. */}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                Open
                <span className="relative inline-block h-5 w-9 shrink-0">
                  <input
                    type="checkbox"
                    aria-label={`${day.day} open`}
                    checked={!day.closed}
                    onChange={(e) => {
                      const open = e.target.checked;
                      updateDay(i, {
                        ...day,
                        closed: !open,
                        ranges: open
                          ? day.ranges.length
                            ? day.ranges
                            : [{ open: "09:00", close: "17:00" }]
                          : day.ranges,
                      });
                    }}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-1" />
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </span>
              </label>
            </div>

            {!day.closed && (
              <div className="mt-2 space-y-1.5">
                {day.ranges.map((range, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <TimeSelect
                      ariaLabel={`${day.day} opening time`}
                      value={range.open}
                      onChange={(v) => {
                        const ranges = [...day.ranges];
                        ranges[ri] = { ...range, open: v };
                        updateDay(i, { ...day, ranges });
                      }}
                    />
                    <span className="text-slate-500">–</span>
                    <TimeSelect
                      ariaLabel={`${day.day} closing time`}
                      value={range.close}
                      onChange={(v) => {
                        const ranges = [...day.ranges];
                        ranges[ri] = { ...range, close: v };
                        updateDay(i, { ...day, ranges });
                      }}
                    />
                    {day.ranges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const ranges = day.ranges.filter((_, x) => x !== ri);
                          updateDay(i, { ...day, ranges });
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-ember-600"
                        aria-label={`Remove this ${day.day} time range`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateDay(i, {
                      ...day,
                      ranges: [...day.ranges, { open: "17:30", close: "21:00" }],
                    })
                  }
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  + Add another time range (e.g. lunch &amp; dinner)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Notes</span>
        <input
          type="text"
          value={data.notes || ""}
          onChange={(e) => update({ ...data, notes: e.target.value })}
          placeholder="e.g. Closed public holidays"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      <div className="mt-4">
        <p className="text-sm font-medium text-slate-700">Holiday &amp; special hours</p>
        <p className="text-xs text-slate-500">Dates that differ from the week above.</p>
        <div className="mt-2 space-y-2">
          {exceptions.map((e, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  aria-label="Date"
                  value={e.date}
                  min={today}
                  onChange={(ev) => ev.target.value && updateException(i, { ...e, date: ev.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-400"
                />
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={!e.closed}
                    onChange={(ev) =>
                      updateException(i, {
                        ...e,
                        closed: !ev.target.checked,
                        ranges: ev.target.checked && e.ranges.length === 0 ? [{ open: "10:00", close: "14:00" }] : e.ranges,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  Open
                </label>
                <button
                  type="button"
                  onClick={() => setExceptions(exceptions.filter((_, x) => x !== i))}
                  className="ml-auto text-xs font-semibold text-slate-500 hover:text-ember-600"
                  aria-label={`Remove ${e.date}`}
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                aria-label="What's on (optional)"
                value={e.label ?? ""}
                maxLength={60}
                onChange={(ev) => updateException(i, { ...e, label: ev.target.value || undefined })}
                placeholder="What's on (optional), e.g. Christmas Day"
                className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-400"
              />
              {!e.closed && (
                <div className="mt-2 flex items-center gap-2">
                  <TimeSelect
                    ariaLabel={`${e.date} opening time`}
                    value={e.ranges[0]?.open ?? "10:00"}
                    onChange={(v) => updateException(i, { ...e, ranges: [{ open: v, close: e.ranges[0]?.close ?? "14:00" }] })}
                  />
                  <span className="text-slate-500">–</span>
                  <TimeSelect
                    ariaLabel={`${e.date} closing time`}
                    value={e.ranges[0]?.close ?? "14:00"}
                    onChange={(v) => updateException(i, { ...e, ranges: [{ open: e.ranges[0]?.open ?? "10:00", close: v }] })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        {exceptions.length < MAX_HOURS_EXCEPTIONS && (
          <button
            type="button"
            onClick={() => setExceptions([...exceptions, { date: today, closed: true, ranges: [] }])}
            className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
          >
            + Add a date
          </button>
        )}
      </div>
    </div>
  );
}
