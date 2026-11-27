import { useState } from "react";
import { useConnection } from "@/state/connection";
import { apiFor } from "@/state/data";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/controls";

/** The backend version this app expects (apps-script/Code.gs). */
export const EXPECTED_BACKEND = "2.3.0";

const older = (a: string, b: string) => {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  return false;
};

export function AboutCard() {
  const conn = useConnection();
  const [backend, setBackend] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    const api = apiFor(conn);
    if (!api) return;
    setChecking(true);
    try {
      setBackend((await api.ping()).version);
    } catch (e) {
      setBackend(e instanceof Error ? `unreachable (${e.message})` : "unreachable");
    } finally {
      setChecking(false);
    }
  };

  const outdated = backend && /^\d/.test(backend) && older(backend, EXPECTED_BACKEND);

  return (
    <Card title="About">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px]">
        <dt className="text-muted">App version</dt>
        <dd className="num">{__APP_VERSION__}</dd>
        {conn.source === "sheet" && (
          <>
            <dt className="text-muted">Apps Script</dt>
            <dd className="flex flex-wrap items-center gap-2">
              {backend ? <span className="num">{backend}</span> : <span className="text-muted">not checked</span>}
              <Button size="sm" variant="ghost" onClick={() => void check()} disabled={checking}>
                {checking ? "Checking…" : "Check"}
              </Button>
            </dd>
          </>
        )}
      </dl>
      {outdated && (
        <p className="mt-2 text-xs text-warning">
          This app expects Apps Script {EXPECTED_BACKEND}. Paste the latest Code.gs, then Deploy › Manage deployments ›
          Edit › New version.
        </p>
      )}
    </Card>
  );
}
