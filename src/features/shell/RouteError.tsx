import { isRouteErrorResponse, useRouteError } from "react-router";
import { AlertTriangle } from "lucide-react";

/** Shown instead of a blank page when something breaks. Data on the device is untouched. */
export function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);
  // A new deployment can remove the old page files a tab still points to; a reload fixes that.
  const stale = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(detail);

  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6 text-ink">
      <div role="alert" className="grid max-w-md gap-3 rounded-xl border border-line bg-surface p-6 text-center">
        <AlertTriangle size={28} className="mx-auto text-warning" aria-hidden />
        <h1 className="text-[17px] font-semibold">{stale ? "A new version is available" : "Something went wrong"}</h1>
        <p className="text-[13px] text-muted">
          {stale
            ? "Reload to get the latest version of the app."
            : "Your expenses and unsynced edits are safe on this device. Reloading usually fixes this."}
        </p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary"
          >
            Reload
          </button>
          <a href="#/overview" className="inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-medium text-muted hover:text-ink">
            Go to Overview
          </a>
        </div>
        {!stale && (
          <details className="text-left text-xs text-muted">
            <summary className="cursor-pointer">Details</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{detail}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
