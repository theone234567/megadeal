"use client";

import {
  DAYS,
  emptySchedule,
  parseBusinessHours,
  serializeBusinessHours,
  type BusinessHoursData,
  type DaySchedule,
} from "@/lib/businessHours";

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

  function copyMondayToWeekdays() {
    const monday = data.schedule[0];
    const schedule = data.schedule.map((d, i) =>
      i >= 1 && i <= 4 ? { ...monday, day: d.day } : d
    );
    update({ ...data, schedule });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          Opening hours <span className="font-normal text-slate-500">(optional)</span>
        </span>
        <button
          type="button"
          onClick={copyMondayToWeekdays}
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          Copy Monday to Tue–Fri
        </button>
      </div>

      <div className="mt-2 space-y-2">
        {data.schedule.map((day, i) => (
          <div key={day.day} className="rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <span className="w-10 text-sm font-semibold text-slate-700">{day.day}</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  aria-label={`${day.day} closed`}
                  checked={day.closed}
                  onChange={(e) =>
                    updateDay(i, {
                      ...day,
                      closed: e.target.checked,
                      ranges: e.target.checked ? day.ranges : day.ranges.length ? day.ranges : [{ open: "09:00", close: "17:00" }],
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Closed
              </label>
            </div>

            {!day.closed && (
              <div className="mt-2 space-y-1.5">
                {day.ranges.map((range, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${day.day} opening time`}
                      value={range.open}
                      onChange={(e) => {
                        const ranges = [...day.ranges];
                        ranges[ri] = { ...range, open: e.target.value };
                        updateDay(i, { ...day, ranges });
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    <span className="text-slate-500">–</span>
                    <input
                      type="time"
                      aria-label={`${day.day} closing time`}
                      value={range.close}
                      onChange={(e) => {
                        const ranges = [...day.ranges];
                        ranges[ri] = { ...range, close: e.target.value };
                        updateDay(i, { ...day, ranges });
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
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
        <span className="mb-1 block font-medium text-slate-700">
          Notes <span className="font-normal text-slate-500">(optional)</span>
        </span>
        <input
          type="text"
          value={data.notes || ""}
          onChange={(e) => update({ ...data, notes: e.target.value })}
          placeholder="e.g. Closed public holidays"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
    </div>
  );
}
