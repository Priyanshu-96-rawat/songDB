/**
 * Suppresses known, harmless console noise from third-party embeds (YouTube IFrame API).
 *
 * Errors suppressed:
 *   1. "Failed to execute 'postMessage' on 'DOMWindow'" — YouTube cross-origin postMessage
 *   2. "PlayerProxy" uncaught errors — internal YouTube embed player errors
 *   3. React DevTools reminder — development-only noise
 *
 * These are all well-known, benign issues that cannot be fixed from application code.
 */

const SUPPRESSED_PATTERNS = [
  /Failed to execute 'postMessage' on 'DOMWindow'/,
  /PlayerProxy/,
  /www-widgetapi/,
  /Download the React DevTools/,
  /lockdown-install/,
  /SES Removing unpermitted intrinsics/,
];

function shouldSuppress(message: string): boolean {
  return SUPPRESSED_PATTERNS.some((pattern) => pattern.test(message));
}

export function installConsoleSuppression(): void {
  if (typeof window === "undefined") return;

  // Suppress uncaught errors from YouTube IFrame API
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = typeof message === "string" ? message : error?.message || "";
    const src = typeof source === "string" ? source : "";

    if (shouldSuppress(msg) || shouldSuppress(src)) {
      return true; // Prevent default error handling
    }

    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Suppress unhandled promise rejections from YouTube
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg =
      typeof reason === "string"
        ? reason
        : reason instanceof Error
          ? reason.message
          : String(reason ?? "");

    if (shouldSuppress(msg)) {
      event.preventDefault();
    }
  });

  // Patch console.warn and console.error to suppress known noise
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = function (...args: unknown[]) {
    const joined = args.map(String).join(" ");
    if (shouldSuppress(joined)) return;
    originalWarn.apply(console, args);
  };

  console.error = function (...args: unknown[]) {
    const joined = args.map(String).join(" ");
    if (shouldSuppress(joined)) return;
    originalError.apply(console, args);
  };
}
