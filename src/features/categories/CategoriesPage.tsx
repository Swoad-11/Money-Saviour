import { useSearchParams } from "react-router";
import { useConfig } from "@/state/config";
import { useAllSummaries, useSelectedMonth } from "@/state/month";
import { DataGate } from "@/features/shell/DataGate";
import { Button, Notice } from "@/ui/controls";
import { ReviewQueue } from "./ReviewQueue";
import { RulesTable } from "./RulesTable";
import { CategoryList } from "./CategoryList";
import { useUncategorized } from "./usage";

const TABS = [
  { id: "review", label: "Review" },
  { id: "rules", label: "Rules" },
  { id: "categories", label: "Categories" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function CategoriesPage() {
  return (
    <DataGate>
      <CategoriesBody />
    </DataGate>
  );
}

function CategoriesBody() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "review") as Tab;
  const { today } = useSelectedMonth();
  const months = useAllSummaries(today);
  const queue = useUncategorized(months);
  const { status, message, dirtyCategories, dirtyRules, deletedRules, flush } = useConfig();
  const unsaved = dirtyCategories.length + dirtyRules.length + deletedRules.length;

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label="Categories sections" className="flex w-fit rounded-lg bg-surface-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${tab === t.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {t.label}
            {t.id === "review" && queue.length > 0 && (
              <span className="num ml-1.5 rounded-full bg-warning-soft px-1.5 text-[11px] text-warning">{queue.length}</span>
            )}
          </button>
        ))}
      </div>

      {status === "outdated" && (
        <Notice tone="warning">
          Changes here are saved on this device, but your Apps Script deployment can't store them yet. Paste the
          latest <code>Code.gs</code> and redeploy it as a new version; they'll sync on their own after that.
          {unsaved > 0 && ` (${unsaved} waiting)`}
        </Notice>
      )}
      {status === "offline" && unsaved > 0 && (
        <Notice tone="info">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1">
              {unsaved} change{unsaved === 1 ? "" : "s"} waiting to sync. {message}
            </span>
            <Button size="sm" onClick={() => void flush()}>
              Retry
            </Button>
          </div>
        </Notice>
      )}

      <div role="tabpanel">
        {tab === "review" && <ReviewQueue months={months} />}
        {tab === "rules" && <RulesTable months={months} />}
        {tab === "categories" && <CategoryList months={months} />}
      </div>
    </div>
  );
}
