"use client";

import { useState } from "react";
import { useWix } from "@/context/WixProvider";

interface EmailSignupFormProps {
  audience: "customer" | "merchant";
  placeholder?: string;
  buttonLabel?: string;
  accent?: "brand" | "ember";
}

export default function EmailSignupForm({
  audience,
  placeholder = "you@example.com",
  buttonLabel = "Count me in",
  accent = "brand",
}: EmailSignupFormProps) {
  const { client } = useWix();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState("saving");
    try {
      await client.items.insert("EmailSignups", {
        email,
        audience,
        source: "coming-soon",
      });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-full bg-white/90 px-5 py-3 text-center text-sm font-bold text-brand-700 shadow-card">
        🎉 You&apos;re on the list — welcome aboard!
      </p>
    );
  }

  const buttonClass =
    accent === "ember"
      ? "bg-ember-500 hover:bg-ember-600"
      : "bg-brand-600 hover:bg-brand-700";

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 rounded-full border border-white/40 bg-white/95 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-white"
        />
        <button
          type="submit"
          disabled={state === "saving"}
          className={`shrink-0 rounded-full px-5 py-3 text-sm font-bold text-white shadow-card transition disabled:opacity-60 ${buttonClass}`}
        >
          {state === "saving" ? "Joining…" : buttonLabel}
        </button>
      </form>
      {state === "error" && (
        <p className="mt-2 text-xs text-red-100">
          Something went wrong — please try again.
        </p>
      )}
    </div>
  );
}
