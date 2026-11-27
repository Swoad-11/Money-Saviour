import type { ReactNode } from "react";
import { Link } from "react-router";
import { CloudOff, AlertTriangle } from "lucide-react";
import { useConnection } from "@/state/connection";
import { useData } from "@/state/data";
import { Button } from "@/ui/controls";

/** Shows connect / loading / error states until month data is available. */
export function DataGate({ children }: { children: ReactNode }) {
  const source = useConnection((s) => s.source);
  const { status, error, months, refresh } = useData();
  const hasData = Object.keys(months).length > 0;

  if (source === "none") {
    return (
      <State icon={<CloudOff size={28} />} title="Connect your spreadsheet">
        <p>Link your Google Sheet in Settings, or try the app with sample data first.</p>
        <Link to="/settings" className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-[13px] font-medium text-on-primary">
          Open Settings
        </Link>
      </State>
    );
  }
  if (!hasData && (status === "loading" || status === "syncing" || status === "idle")) {
    return <Skeleton />;
  }
  if (!hasData) {
    return (
      <State icon={<AlertTriangle size={28} className="text-warning" />} title="Can't load your expenses">
        <p>{error?.message ?? "No month tabs were found in the spreadsheet."}</p>
        <div className="mt-3 flex justify-center gap-2">
          <Button onClick={() => void refresh()}>Try again</Button>
          <Link to="/settings" className="inline-flex h-9 items-center rounded-lg px-3.5 text-[13px] font-medium text-muted hover:text-ink">
            Settings
          </Link>
        </div>
      </State>
    );
  }
  return <>{children}</>;
}

function State({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-line bg-surface px-6 py-16 text-center">
      <div className="mb-3 text-muted">{icon}</div>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <div className="mt-1 max-w-sm text-[13px] text-muted">{children}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-3">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-muted" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-muted" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-surface-muted" />
    </div>
  );
}
