import { Link } from "react-router";
import { CloudOff, RefreshCw, CheckCircle2, AlertTriangle, Database } from "lucide-react";
import { useData } from "@/state/data";
import { useConnection } from "@/state/connection";
import { formatTime } from "@/ui/format";

export function SyncBadge() {
  const source = useConnection((s) => s.source);
  const { status, error, fetchedAt, fromCache, refresh } = useData();

  if (source === "none") {
    return (
      <Link
        to="/settings"
        className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted hover:text-ink"
      >
        <CloudOff size={14} aria-hidden /> Not connected
      </Link>
    );
  }

  const busy = status === "loading" || status === "syncing";
  let icon = <CheckCircle2 size={14} className="text-primary" aria-hidden />;
  let label = source === "sample" ? "Sample data" : "Synced";
  let tone = "text-muted";
  if (busy) {
    icon = <RefreshCw size={14} className="animate-spin" aria-hidden />;
    label = "Syncing…";
  } else if (error) {
    icon = <AlertTriangle size={14} className="text-warning" aria-hidden />;
    label = fetchedAt ? "Offline · cached" : "Can't sync";
    tone = "text-warning";
  } else if (fromCache) {
    icon = <Database size={14} aria-hidden />;
    label = "Cached";
  }

  return (
    <button
      type="button"
      onClick={() => void refresh()}
      aria-label={`${label}. Sync now`}
      disabled={busy}
      title={
        error
          ? `${error.message}${fetchedAt ? `\nShowing data from ${formatTime(fetchedAt)}` : ""}`
          : fetchedAt
            ? `Last synced ${formatTime(fetchedAt)}. Click to sync now.`
            : "Sync now"
      }
      className={`flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium hover:bg-surface-muted disabled:cursor-wait ${tone}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
