import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Card } from "@/ui/Card";
import { Button, Notice } from "@/ui/controls";
import { clearCache } from "@/data/db";
import { useData } from "@/state/data";
import { useConnection } from "@/state/connection";
import { formatTime } from "@/ui/format";

export function SyncCard() {
  const source = useConnection((s) => s.source);
  const { status, error, fetchedAt, fromCache, workbook, months, refresh, start } = useData();
  const [confirmClear, setConfirmClear] = useState(false);
  if (source === "none") return null;

  const busy = status === "loading" || status === "syncing";
  const monthCount = Object.keys(months).length;
  const warnings = Object.values(months).flatMap((m) => m.warnings.map((w) => `${m.tab}: ${w}`));

  return (
    <Card title="Sync">
      <div className="grid gap-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px]">
          <dt className="text-muted">Spreadsheet</dt>
          <dd className="font-medium">{workbook?.title ?? "—"}</dd>
          <dt className="text-muted">Months</dt>
          <dd className="num">{monthCount}</dd>
          <dt className="text-muted">Time zone</dt>
          <dd>{workbook?.timeZone ?? "—"}</dd>
          <dt className="text-muted">Last synced</dt>
          <dd>
            {fetchedAt ? formatTime(fetchedAt) : "Never"}
            {fromCache && !busy && <span className="text-muted"> · showing cached data</span>}
          </dd>
        </dl>

        {error && (
          <Notice tone={fetchedAt ? "warning" : "danger"}>
            {error.message}
            {fetchedAt && " The app is showing the last data it saved on this device."}
          </Notice>
        )}
        {warnings.length > 0 && (
          <Notice tone="warning">
            <p className="font-medium">The sheet has rows the app skipped:</p>
            <ul className="mt-1 list-disc pl-5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Notice>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void refresh()} disabled={busy}>
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {busy ? "Syncing…" : "Sync now"}
          </Button>
          {confirmClear ? (
            <>
              <Button
                variant="danger"
                onClick={async () => {
                  await clearCache();
                  setConfirmClear(false);
                  await start();
                }}
              >
                Clear and reload
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmClear(true)}>
              <Trash2 size={15} /> Clear local cache
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
