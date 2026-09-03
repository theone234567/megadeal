"use client";

import { useEffect } from "react";

// Backstops app/error.tsx for the rare case where the root layout itself
// (not just a page/route segment) throws — Next.js only invokes this file
// then, and requires it to render its own <html>/<body> since it fully
// replaces the root layout. No Tailwind/global CSS is guaranteed to have
// loaded at this point, so styling here is deliberately plain inline CSS.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-NZ">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "1.5rem",
          fontFamily: "system-ui, sans-serif",
          color: "#0f172a",
        }}
      >
        <span style={{ fontSize: "2.5rem" }}>🐘</span>
        <h1 style={{ marginTop: "0.75rem", fontSize: "1.25rem", fontWeight: 700 }}>
          Something went sideways
        </h1>
        <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#64748b", maxWidth: 28 + "rem" }}>
          That&apos;s on us, not you — the site hit a snag loading. Give it another go.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            borderRadius: "999px",
            background: "#7a17f0",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.875rem",
            padding: "0.75rem 1.5rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
