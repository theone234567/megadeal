"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { renderVisibleCaptcha, type CaptchaLoadFailure, type VisibleCaptchaHandle } from "@/lib/recaptcha";

export type RecaptchaCheckboxHandle = {
  /** Clear the solved state so the visitor must tick again. Tokens are
   *  single-use, so this must run after every submission attempt. */
  reset: () => void;
};

type Props = {
  /** Wix's own visible site key, from `client.auth.captchaVisibleSiteKey`.
   *  Our own key would not work — Wix verifies the token, we don't. */
  siteKey: string;
  /** Receives the token when solved, or null when cleared or expired. */
  onChange: (token: string | null) => void;
};

/**
 * The "I'm not a robot" checkbox required for Wix member registration.
 *
 * Deliberately visible rather than invisible: Wix's registration endpoint
 * reads the token from its `Recaptcha` field, which is the visible
 * variant. An invisible token arrives in a different field and registration
 * fails with a 403 that reports the token as missing entirely.
 *
 * If reCAPTCHA can't load — blocked script, offline, privacy extension —
 * this renders an honest message instead of nothing, because a form that
 * silently can't be submitted is worse than one that says why.
 */
const RecaptchaCheckbox = forwardRef<RecaptchaCheckboxHandle, Props>(
  function RecaptchaCheckbox({ siteKey, onChange }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const handleRef = useRef<VisibleCaptchaHandle | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
    const [failure, setFailure] = useState<CaptchaLoadFailure | null>(null);

    // onChange is called from reCAPTCHA's own callbacks, which are captured
    // once at render time. Routing through a ref keeps those callbacks
    // pointing at the current handler without re-rendering the widget —
    // re-rendering it would throw away a checkbox the visitor already ticked.
    const onChangeRef = useRef(onChange);
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container || !siteKey) {
        setStatus("unavailable");
        return;
      }

      let cancelled = false;

      void renderVisibleCaptcha(container, siteKey, {
        onToken: (token) => onChangeRef.current(token),
        onExpire: () => onChangeRef.current(null),
        onError: () => onChangeRef.current(null),
      }).then(({ handle, failure: why }) => {
        if (cancelled) return;
        handleRef.current = handle;
        setFailure(why ?? null);
        setStatus(handle ? "ready" : "unavailable");
      });

      return () => {
        cancelled = true;
      };
    }, [siteKey]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        handleRef.current?.reset();
        onChangeRef.current(null);
      },
    }));

    return (
      <div className="space-y-2">
        {/* reCAPTCHA draws its iframe into this node. It must stay mounted
            and must not be re-keyed, or a ticked box is lost. */}
        <div ref={containerRef} />

        {status === "loading" && (
          <p className="text-sm text-slate-500">Loading security check…</p>
        )}

        {status === "unavailable" && (
          <p className="text-sm text-ember-600">
            {/* Only "blocked" and "timeout" are plausibly the visitor's end.
                The others are ours, and telling someone to disable an
                ad-blocker they may not even have — to fix our bug — wastes
                their time and makes us look wrong, which we would be. */}
            {failure === "blocked" || failure === "timeout" ? (
              <>
                We couldn&rsquo;t load the security check. It&rsquo;s usually an ad-blocker or
                a strict privacy setting — try turning those off for this page, or use a
                different browser.
              </>
            ) : (
              <>
                The security check isn&rsquo;t working on our end. This is our fault, not
                anything you&rsquo;ve done. Please try again shortly, or email us and
                we&rsquo;ll set your account up manually.
              </>
            )}{" "}
            <span className="opacity-70">[captcha-{failure ?? "unknown"}]</span>
          </p>
        )}
      </div>
    );
  }
);

export default RecaptchaCheckbox;
