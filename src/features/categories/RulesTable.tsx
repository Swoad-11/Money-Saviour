import { useMemo, useState } from "react";
import { RotateCcw, Search, Trash2, Ban } from "lucide-react";
import { BUILTIN_RULES, findRule, normalizeName, UNCATEGORIZED, type Kind, type MonthSummary, type Rule } from "@/core";
import { isBuiltinKey, useConfig } from "@/state/config";
import { categoryById } from "@/state/month";
import { Button, TextInput } from "@/ui/controls";
import { categoryColor } from "@/ui/format";
import { CategorySelect } from "./CategorySelect";
import { useUsage } from "./usage";

type Origin = "builtin" | "changed" | "yours";

interface Row {
  rule: Rule;
  origin: Origin;
}

export function RulesTable({ months }: { months: MonthSummary[] }) {
  const { userRules, index, setRule, setRuleKind, setAliases, removeRule, disableBuiltin } = useConfig();
  const usage = useUsage(months);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("");
  const [test, setTest] = useState("");

  const rows = useMemo<Row[]>(() => {
    const user = new Map(userRules.map((r) => [r.key, r]));
    const out: Row[] = BUILTIN_RULES.filter((r) => !user.has(r.key)).map((rule) => ({ rule, origin: "builtin" }));
    for (const r of userRules) out.push({ rule: r, origin: isBuiltinKey(r.key) ? "changed" : "yours" });
    return out.sort((a, b) => a.rule.key.localeCompare(b.rule.key));
  }, [userRules]);

  const needle = normalizeName(q);
  const shown = rows.filter(
    ({ rule }) =>
      (!needle || rule.key.includes(needle) || rule.aliases.some((a) => a.includes(needle))) &&
      (!cat || rule.categoryId === cat),
  );

  const testKey = normalizeName(test);
  const testRule = testKey ? findRule(index, testKey) : undefined;

  const add = () => {
    if (!normalizeName(newName) || !newCat) return;
    setRule(newName, newCat);
    setNewName("");
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-xl border border-line bg-surface-muted/50 p-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted">Add a rule</span>
          <div className="flex gap-2">
            <TextInput aria-label="Item name" placeholder="Item name, e.g. aam" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <CategorySelect label="Category for the new rule" value={newCat} onChange={setNewCat} allowNone={false} placeholder="Category" className="h-9 w-40 shrink-0" />
            <Button variant="primary" disabled={!normalizeName(newName) || !newCat} onClick={add}>
              Add
            </Button>
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted">Test a name</span>
          <TextInput aria-label="Test an item name" placeholder="Type an item name" value={test} onChange={(e) => setTest(e.target.value)} />
          {testKey && (
            <p className="text-xs" aria-live="polite">
              {testRule && testRule.categoryId !== UNCATEGORIZED ? (
                <>
                  <span className="font-mono">{testKey}</span> → <strong>{categoryById(testRule.categoryId).name}</strong>{" "}
                  <span className="text-muted">
                    via rule "{testRule.key}"{testRule.key !== testKey && testRule.aliases.includes(testKey) ? " (alternate spelling)" : ""}
                  </span>
                </>
              ) : (
                <span className="text-muted">
                  <span className="font-mono">{testKey}</span> has no rule: it would be Uncategorized.
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
          <TextInput aria-label="Search rules" className="pl-8" placeholder="Search item names" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <CategorySelect label="Filter by category" value={cat} onChange={setCat} placeholder="All categories" className="h-9" />
        {cat && (
          <Button variant="ghost" onClick={() => setCat("")}>
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted">
        {shown.length} of {rows.length} rules. Alternate spellings are comma-separated; a change applies to every month.
      </p>

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="py-2 pr-3 font-medium">Also matches</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Kind</th>
              <th className="py-2 pr-3 text-right font-medium">Used</th>
              <th className="py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ rule, origin }) => {
              const c = categoryById(rule.categoryId);
              const disabled = rule.categoryId === UNCATEGORIZED;
              return (
                <tr key={rule.key} className="border-b border-line last:border-0">
                  <td className="py-1.5 pr-3">
                    <span className="font-medium">{rule.key}</span>
                    {origin !== "builtin" && (
                      <span className="ml-1.5 rounded bg-primary-soft px-1 py-0.5 text-[10px] font-medium text-primary-strong dark:text-primary">
                        {origin === "yours" ? "yours" : disabled ? "turned off" : "changed"}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <AliasInput rule={rule} onSave={(a) => setAliases(rule.key, a)} />
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: categoryColor(c) }} />
                      <CategorySelect label={`Category for ${rule.key}`} value={rule.categoryId} onChange={(id) => setRule(rule.key, id)} />
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    <select
                      aria-label={`Kind for ${rule.key}`}
                      value={rule.kind ?? ""}
                      onChange={(e) => setRuleKind(rule.key, (e.target.value || undefined) as Kind | undefined)}
                      className="h-8 rounded-md border border-line bg-surface px-1.5 text-[13px]"
                    >
                      <option value="">Category default ({c.kind})</option>
                      <option value="fixed">Fixed</option>
                      <option value="variable">Variable</option>
                    </select>
                  </td>
                  <td className="num py-1.5 pr-3 text-right text-muted">{usage.byRule.get(rule.id) ?? 0}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    {origin === "builtin" ? (
                      <IconAction label={`Turn off rule ${rule.key}`} onClick={() => disableBuiltin(rule.key)}>
                        <Ban size={14} />
                      </IconAction>
                    ) : origin === "changed" ? (
                      <IconAction label={`Reset ${rule.key} to the built-in rule`} onClick={() => removeRule(rule.key)}>
                        <RotateCcw size={14} />
                      </IconAction>
                    ) : (
                      <IconAction label={`Delete rule ${rule.key}`} onClick={() => removeRule(rule.key)} danger>
                        <Trash2 size={14} />
                      </IconAction>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AliasInput({ rule, onSave }: { rule: Rule; onSave: (aliases: string[]) => void }) {
  const initial = rule.aliases.join(", ");
  const [value, setValue] = useState(initial);
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setValue(initial);
  }
  const commit = () => {
    if (value.trim() === initial) return;
    onSave(value.split(",").map((s) => s.trim()).filter(Boolean));
  };
  return (
    <input
      aria-label={`Alternate spellings for ${rule.key}`}
      value={value}
      placeholder="—"
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      className="h-8 w-full min-w-28 rounded-md border border-transparent bg-transparent px-1.5 text-[13px] text-muted hover:border-line focus:border-primary focus:bg-surface focus:text-ink focus:outline-none"
    />
  );
}

function IconAction({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-grid size-8 place-items-center rounded-lg text-muted ${danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-surface-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
