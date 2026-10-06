"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Admin → Subscribers: write the launch email, look at it, send yourself a
 * test, then send it to everyone in one audience (app/api/admin/announcement,
 * lib/announcement.ts). Sending is a batch at a time, repeated until done;
 * each address gets it once, however often the button is pressed.
 */

type Audience = "customers" | "waitlist" | "businesses" | "pending";

const AUDIENCE_LABEL: Record<Audience, string> = {
  customers: "Deal-alert subscribers",
  waitlist: "Businesses on the launch waitlist",
  businesses: "Approved businesses",
  pending: "Businesses awaiting approval",
};

interface Status {
  total: number;
  alreadySent: number;
  /** Couldn't be sent in the last hour; tried again after that. */
  waiting: number;
  launched: boolean;
  testTo: boolean;
  draft: { subject: string; body: string };
}

export default function AnnouncementPanel() {
  const [audience, setAudience] = useState<Audience>("customers");
  // Each email name goes to each person once. "launch" is the launch
  // email; a new name (e.g. "deals-2026-11") is a new email.
  const [campaign, setCampaign] = useState("launch");
  const campaignOk = /^[a-z0-9][a-z0-9-]{1,39}$/.test(campaign);
  const [status, setStatus] = useState<Status | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "preview" | "test" | "send">(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async (a: Audience, c: string, keepText = false) => {
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/announcement?audience=${a}&campaign=${encodeURIComponent(c)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load.");
      setStatus(data);
      if (!keepText) {
        setSubject(data.draft.subject);
        setBody(data.draft.body);
        setPreview(null);
      }
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Couldn't load." });
    }
  }, []);

  useEffect(() => {
    load(audience, "launch");
    setCampaign("launch");
  }, [audience, load]);

  async function post(action: "preview" | "test" | "send") {
    const res = await fetch("/api/admin/announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, audience, campaign, subject, body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  async function run(action: "preview" | "test") {
    setBusy(action);
    setMessage(null);
    try {
      const data = await post(action);
      if (action === "preview") setPreview(data.html);
      else setMessage({ tone: "ok", text: "Test sent to your admin email address." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  async function fillWithDeals() {
    setMessage(null);
    try {
      const res = await fetch("/api/admin/announcement?draft=deals", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load the deals.");
      setBody(data.body);
      setPreview(null);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Couldn't load the deals." });
    }
  }

  async function sendAll() {
    setConfirming(false);
    setBusy("send");
    setMessage(null);
    let sentTotal = 0;
    // A batch that sends nothing is normal once in a while (a run of
    // addresses that can't be sent to; the server passes over them from
    // then on). Two in a row means sending itself is down: stop there
    // rather than work through the whole list failing.
    let emptyBatches = 0;
    try {
      for (let i = 0; i < 500; i++) {
        const data = await post("send");
        sentTotal += data.sent;
        emptyBatches = data.sent === 0 ? emptyBatches + 1 : 0;
        setMessage({ tone: "ok", text: `Sending… ${sentTotal} sent so far.` });
        if (data.remaining === 0 || emptyBatches >= 2) {
          setMessage(
            data.remaining
              ? {
                  tone: "error",
                  text: `${sentTotal} sent, then sending stopped: emails weren't going out. ${data.remaining} not tried yet. Press Send again later; nobody gets it twice.`,
                }
              : data.waiting
                ? { tone: "error", text: `${sentTotal} sent. ${data.waiting} couldn't be sent; press Send again in an hour to retry them.` }
                : { tone: "ok", text: `Done. ${sentTotal} sent.` }
          );
          break;
        }
      }
    } catch (err) {
      setMessage({ tone: "error", text: `${sentTotal} sent, then: ${err instanceof Error ? err.message : "sending stopped."}` });
    } finally {
      setBusy(null);
      load(audience, campaign, true);
    }
  }

  const toSend = status ? status.total - status.alreadySent - status.waiting : 0;

  return (
    <section className="mb-8 rounded-xl border border-slate-200 p-5">
      <h3 className="text-base font-extrabold text-slate-900">Email subscribers</h3>
      <p className="mt-1 text-sm text-slate-600">
        One email to everyone in a group who asked for it: confirmed subscribers only, each person once. Starts with the launch
        email. Look at it and send yourself a test first.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-3">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Who it&apos;s for
            <select
              id="announcement-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              disabled={busy !== null}
              className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
            >
              {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_LABEL[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Email name <span className="font-normal text-slate-500">(each name goes to each person once; use a new one, like deals-2026-11, for a new email)</span>
            <input
              id="announcement-campaign"
              value={campaign}
              maxLength={40}
              onChange={(e) => setCampaign(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              onBlur={() => campaignOk && load(audience, campaign, true)}
              disabled={busy !== null}
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono font-normal"
            />
          </label>
          <p className="text-sm text-slate-600">
            {status
              ? `${status.total} ${status.total === 1 ? "person" : "people"}${status.alreadySent ? `, ${status.alreadySent} already sent it` : ""}${
                  status.waiting ? `, ${status.waiting} couldn't be sent in the last hour` : ""
                }.`
              : "Counting…"}
          </p>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Subject
            <input
              id="announcement-subject"
              value={subject}
              maxLength={150}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Message <span className="font-normal text-slate-500">(a blank line starts a new paragraph; the button and unsubscribe link are added for you)</span>
            <textarea
              id="announcement-body"
              value={body}
              maxLength={4000}
              rows={8}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          {audience === "customers" && status?.launched && (
            <button
              type="button"
              onClick={fillWithDeals}
              disabled={busy !== null}
              className="justify-self-start text-sm font-semibold text-brand-700 underline underline-offset-2 hover:no-underline disabled:opacity-60"
            >
              Fill the message with the live deals
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => run("preview")}
              disabled={busy !== null}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
            >
              {busy === "preview" ? "Loading…" : "Preview"}
            </button>
            <button
              type="button"
              onClick={() => run("test")}
              disabled={busy !== null || !status?.testTo}
              title={status?.testTo ? undefined : "Set ADMIN_NOTIFY_EMAIL to send yourself a test"}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
            >
              {busy === "test" ? "Sending…" : "Send me a test"}
            </button>
            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={busy !== null || !status?.launched || toSend <= 0 || !campaignOk}
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {busy === "send" ? "Sending…" : `Send to ${toSend} ${toSend === 1 ? "person" : "people"}`}
              </button>
            ) : (
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                Send &ldquo;{subject}&rdquo; to {toSend} {toSend === 1 ? "person" : "people"}?
                <button type="button" onClick={sendAll} className="rounded-full bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">
                  Yes, send it
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-700">
                  Cancel
                </button>
              </span>
            )}
          </div>
          {status && !status.launched && (
            <p className="text-sm text-slate-500">Sending opens once MegaDeal has launched. You can write, preview and test it now.</p>
          )}
          {message && (
            <p role="status" className={`text-sm ${message.tone === "error" ? "text-red-700" : "text-emerald-700"}`}>
              {message.text}
            </p>
          )}
        </div>

        <div className="min-w-0">
          {preview ? (
            <iframe
              title="Email preview"
              srcDoc={`<body style="margin:0;padding:16px;background:#f4f2f7">${preview}</body>`}
              sandbox=""
              className="h-[480px] w-full rounded-lg border border-slate-200 bg-white"
            />
          ) : (
            <div className="grid h-full min-h-[200px] place-items-center rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Press Preview to see the email as it will arrive.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
