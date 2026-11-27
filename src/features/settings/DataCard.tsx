import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { itemsCsv, monthsCsv } from "@/core";
import { parseBackup, type Backup } from "@/data/backup";
import { clearCache, db } from "@/data/db";
import { applyBackup, createBackup, type RestoreResult } from "@/state/backup";
import { useConfig } from "@/state/config";
import { useConnection } from "@/state/connection";
import { useData } from "@/state/data";
import { categoryById, useAllSummaries, useSelectedMonth } from "@/state/month";
import { Card } from "@/ui/Card";
import { Button, Notice } from "@/ui/controls";
import { downloadText, stamp } from "@/ui/download";
import { formatTime, monthLabel } from "@/ui/format";
import { useToast } from "@/ui/toast-store";

export function DataCard() {
  const source = useConnection((s) => s.source);
  if (source === "none") return null;
  return (
    <Card title="Data">
      <div className="grid gap-5">
        <BackupSection />
        <CsvSection />
        <ClearSection />
      </div>
    </Card>
  );
}

function BackupSection() {
  const show = useToast((s) => s.show);
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opts, setOpts] = useState({ config: true, edits: true });
  const [result, setResult] = useState<RestoreResult | null>(null);
  const workbook = useData((s) => s.workbook);

  const download = () => {
    try {
      const b = createBackup();
      downloadText(`money-saviour-backup-${stamp()}.json`, JSON.stringify(b, null, 1), "application/json");
      show({ message: "Backup downloaded. It doesn't include your access token." });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const pick = async (f: File | undefined) => {
    setError(null);
    setResult(null);
    setPending(null);
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) return setError("That file is too large to be a backup.");
    const r = parseBackup(await f.text());
    if (r.ok) setPending(r.backup);
    else setError(r.error);
  };

  const restore = async () => {
    if (!pending) return;
    const r = await applyBackup(pending, opts);
    setResult(r);
    setPending(null);
    if (file.current) file.current.value = "";
  };

  const other = pending && workbook && pending.workbook && pending.workbook.title !== workbook.title;

  return (
    <section className="grid gap-2">
      <h3 className="text-[13px] font-medium">Backup</h3>
      <p className="text-xs text-muted">
        A JSON file with your months, rules, categories, templates and unsynced edits. Your access token and script URL
        are never included.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={download}>
          <Download size={15} /> Download backup
        </Button>
        <Button onClick={() => file.current?.click()}>
          <Upload size={15} /> Restore from file
        </Button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Backup file"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>
      {error && <Notice tone="danger">{error}</Notice>}

      {pending && (
        <div className="grid gap-3 rounded-lg border border-line p-3 text-[13px]">
          <p>
            Backup from <strong>{formatTime(pending.exportedAt)}</strong>
            {pending.workbook ? ` · ${pending.workbook.title}` : ""} · {pending.months.length} months,{" "}
            {pending.config.userRules.length} of your rules, {pending.config.templates.length} templates,{" "}
            {pending.outbox.length} unsynced edits.
          </p>
          {other && (
            <Notice tone="warning">
              This backup is from a different spreadsheet ({pending.workbook!.title}). Only rules, categories and
              templates can be restored.
            </Notice>
          )}
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--ms-primary)]"
              checked={opts.config}
              onChange={(e) => setOpts((o) => ({ ...o, config: e.target.checked }))}
            />
            <span>
              Restore rules, categories and templates
              <span className="block text-xs text-muted">Merged with what you have, then saved to your sheet.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--ms-primary)]"
              checked={opts.edits}
              disabled={!!other || pending.outbox.length === 0}
              onChange={(e) => setOpts((o) => ({ ...o, edits: e.target.checked }))}
            />
            <span>
              Restore {pending.outbox.length} unsynced edit{pending.outbox.length === 1 ? "" : "s"}
              <span className="block text-xs text-muted">
                Held on the Expenses page until you press Retry, so nothing changes in your sheet by surprise.
              </span>
            </span>
          </label>
          <div className="flex gap-2">
            <Button variant="primary" disabled={!opts.config && !opts.edits} onClick={() => void restore()}>
              Restore
            </Button>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {result && (
        <Notice tone="success">
          Restored {result.rules} rules, {result.categories} categories and {result.templates} templates
          {result.edits ? `, plus ${result.edits} edits held for review on the Expenses page` : ""}.
          {result.monthsUsed ? " Months from the backup are shown until the sheet syncs." : ""}
          {result.skippedReason ? ` ${result.skippedReason}` : ""}
        </Notice>
      )}
    </section>
  );
}

function CsvSection() {
  const { key, today } = useSelectedMonth();
  const months = useAllSummaries(today);
  const categories = useConfig((s) => s.categories);
  const [scope, setScope] = useState<string>("all");
  const [kind, setKind] = useState<"items" | "months">("items");

  const run = () => {
    const chosen = scope === "all" ? months : months.filter((m) => m.key === scope);
    const csv = kind === "items" ? itemsCsv(chosen, (id) => categoryById(id).name) : monthsCsv(chosen, categories);
    const name = `money-saviour-${kind}-${scope === "all" ? "all" : scope}-${stamp()}.csv`;
    downloadText(name, csv, "text/csv;charset=utf-8");
  };

  return (
    <section className="grid gap-2">
      <h3 className="text-[13px] font-medium">Export to CSV</h3>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <select
          aria-label="What to export"
          value={kind}
          onChange={(e) => setKind(e.target.value as "items" | "months")}
          className="h-9 rounded-lg border border-line bg-surface px-2"
        >
          <option value="items">Every item</option>
          <option value="months">Monthly totals by category</option>
        </select>
        <select
          aria-label="Months to export"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="h-9 rounded-lg border border-line bg-surface px-2"
        >
          <option value="all">All months</option>
          {[...months].reverse().map((m) => (
            <option key={m.key} value={m.key}>
              {monthLabel(m.key)}
              {m.key === key ? " (selected)" : ""}
            </option>
          ))}
        </select>
        <Button onClick={run} disabled={!months.length}>
          <FileSpreadsheet size={15} /> Export
        </Button>
      </div>
      <p className="text-xs text-muted">Opens in Excel and Google Sheets. Text is kept as text, never run as a formula.</p>
    </section>
  );
}

function ClearSection() {
  const ops = useData((s) => s.ops);
  const startData = useData((s) => s.start);
  const startConfig = useConfig((s) => s.start);
  const dirty = useConfig((s) => s.dirtyRules.length + s.dirtyCategories.length + s.dirtyTemplates.length);
  const [confirm, setConfirm] = useState(false);
  const unsynced = Object.keys(ops).length;

  const clearAll = async () => {
    await clearCache(true);
    await (await db()).clear("config");
    setConfirm(false);
    await Promise.all([startData(), startConfig()]);
  };

  return (
    <section className="grid gap-2">
      <h3 className="text-[13px] font-medium">Remove data from this device</h3>
      <p className="text-xs text-muted">
        Clears everything the app saved in this browser. Your spreadsheet isn't touched, and the connection stays.
      </p>
      {confirm ? (
        <div className="grid gap-2">
          {(unsynced > 0 || dirty > 0) && (
            <Notice tone="danger">
              {unsynced > 0 && `${unsynced} edit${unsynced === 1 ? " hasn't" : "s haven't"} reached the sheet. `}
              {dirty > 0 && `${dirty} rule/category/template change${dirty === 1 ? " hasn't" : "s haven't"} been saved to the sheet. `}
              They will be lost. Download a backup first if you want to keep them.
            </Notice>
          )}
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => void clearAll()}>
              <Trash2 size={15} /> Remove everything
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" className="w-fit" onClick={() => setConfirm(true)}>
          <Trash2 size={15} /> Remove data from this device
        </Button>
      )}
    </section>
  );
}
