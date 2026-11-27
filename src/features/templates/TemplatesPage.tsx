import { useState } from "react";
import { CopyPlus, Pencil, Plus, Sparkles } from "lucide-react";
import { templateFromMonth, templateTotal, type Template } from "@/core";
import { useConfig } from "@/state/config";
import { useAllSummaries, useSelectedMonth } from "@/state/month";
import { DataGate } from "@/features/shell/DataGate";
import { Button, Notice } from "@/ui/controls";
import { monthLabel, taka } from "@/ui/format";
import { useToast } from "@/ui/toast-store";
import { TemplateEditor } from "./TemplateEditor";
import { ApplyTemplateDialog } from "./ApplyTemplateDialog";

export function TemplatesPage() {
  return (
    <DataGate>
      <TemplatesBody />
    </DataGate>
  );
}

const newId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function TemplatesBody() {
  const { today } = useSelectedMonth();
  const months = useAllSummaries(today);
  const { templates, saveTemplate, deleteTemplate, status } = useConfig();
  const showToast = useToast((s) => s.show);
  const [editing, setEditing] = useState<Template | null>(null);
  const [applying, setApplying] = useState<Template | null>(null);
  const current = today.slice(0, 7);

  // Suggest a "Monthly bills" template from the latest complete month that had fixed items.
  const source = [...months].reverse().find((m) => m.key < current && templateFromMonth(m).length > 0);
  const suggestion = source ? templateFromMonth(source) : [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-[13px] text-muted">
          A template is a list of expenses you expect every month. Applying it adds them to the right days.
        </p>
        <Button variant="primary" onClick={() => setEditing({ id: newId(), name: "", items: [] })}>
          <Plus size={15} /> New template
        </Button>
      </div>

      {status === "outdated" && (
        <Notice tone="warning">
          Templates are saved on this device. To store them in your sheet too, redeploy the latest Code.gs as a new
          version.
        </Notice>
      )}

      {templates.length === 0 && suggestion.length > 0 && source && (
        <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary-soft/50 p-4">
          <div className="flex items-start gap-2">
            <Sparkles size={16} className="mt-0.5 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Start with your monthly bills</p>
              <p className="text-[13px] text-muted">
                From {monthLabel(source.key)}: {suggestion.map((s) => s.name).join(", ")} · {taka(templateTotal({ items: suggestion }))}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setEditing({ id: newId(), name: "Monthly bills", items: suggestion })}>
              Review and save
            </Button>
          </div>
        </div>
      )}

      {templates.length === 0 && suggestion.length === 0 && (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <CopyPlus size={28} className="mb-3 text-muted" aria-hidden />
          <p className="text-sm text-muted">No templates yet. Create one for bills you pay every month.</p>
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <li key={t.id} className="grid gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{t.name}</h2>
                <p className="text-xs text-muted">
                  {t.items.length} item{t.items.length === 1 ? "" : "s"} · {taka(templateTotal(t))}
                </p>
              </div>
              <Button size="sm" variant="ghost" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
                <Pencil size={14} />
              </Button>
            </div>
            <ul className="grid gap-1 text-[13px]">
              {t.items.slice(0, 6).map((i, k) => (
                <li key={k} className="flex gap-2">
                  <span className="num w-10 shrink-0 text-xs text-muted">Day {i.day}</span>
                  <span className="min-w-0 flex-1 truncate">{i.name}</span>
                  <span className="num">{i.amount}</span>
                </li>
              ))}
              {t.items.length > 6 && <li className="text-xs text-muted">and {t.items.length - 6} more</li>}
            </ul>
            <Button className="justify-self-start" onClick={() => setApplying(t)}>
              <CopyPlus size={15} /> Apply to a month
            </Button>
          </li>
        ))}
      </ul>

      {editing && (
        <TemplateEditor
          initial={editing}
          isNew={!templates.some((t) => t.id === editing.id)}
          months={months}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            saveTemplate(t);
            setEditing(null);
            showToast({ message: `Saved "${t.name}"` });
          }}
          onDelete={
            templates.some((t) => t.id === editing.id)
              ? () => {
                  deleteTemplate(editing.id);
                  setEditing(null);
                  showToast({ message: `Deleted "${editing.name}"` });
                }
              : undefined
          }
        />
      )}
      {applying && <ApplyTemplateDialog template={applying} defaultMonth={current} onClose={() => setApplying(null)} />}
    </div>
  );
}
