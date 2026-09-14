"use client";

import { useEffect, useState } from "react";
import { createWixBrowserClient } from "@/lib/wixBrowserClient";

export default function LoginCallbackPage() {
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function verifyLogin() {
      const raw = localStorage.getItem("oauthRedirectData");
      localStorage.removeItem("oauthRedirectData");
      const data = raw ? JSON.parse(raw) : null;

      const client = createWixBrowserClient();

      try {
        const { code, state } = client.auth.parseFromUrl();
        let tokens = await client.auth.getMemberTokens(code, state, data);
        // The token exchange can briefly return before the refresh token is
        // attached; Wix's own quick-start docs call this a known race and
        // recommend retrying until it's present.
        let attempts = 0;
        while (!tokens?.refreshToken?.value && attempts < 10) {
          tokens = await client.auth.getMemberTokens(code, state, data);
          attempts += 1;
        }
        // Handed to the server, which puts them in an httpOnly cookie.
        // Writing them into a readable cookie here was the OAuth-redirect
        // half of the same problem the Custom Login path had: a refresh
        // token sitting in document.cookie for any injected script to take.
        const sessionRes = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokens }),
        });
        if (!sessionRes.ok) {
          throw new Error("Signed in, but we couldn't start your session. Please try again.");
        }
        window.location.href = data?.originalUri || "/";
      } catch (e: any) {
        setNextPage(data?.originalUri || "/");
        setErrorMessage(e?.toString?.() ?? "Something went wrong signing you in.");
      }
    }
    verifyLogin();
  }, []);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {errorMessage ? (
        <>
          <p className="text-sm text-ember-600">{errorMessage}</p>
          {nextPage && (
            <a href={nextPage} className="mt-4 text-brand-600 hover:underline">
              Continue →
            </a>
          )}
        </>
      ) : (
        <p className="text-slate-500">Signing you in…</p>
      )}
    </main>
  );
}
