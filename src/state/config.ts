import { create } from "zustand";
import {
  BUILTIN_CATEGORIES,
  BUILTIN_RULES,
  buildIndex,
  normalizeName,
  UNCATEGORIZED,
  type Category,
  type Kind,
  type Rule,
  type RuleIndex,
} from "@/core";
import { isOutdatedBackend } from "@/data/api";
import { loadConfig, saveConfig as saveLocal, type StoredConfig } from "@/data/db";
import type { CategoryRow, RuleRow } from "@/data/schema";
import { useConnection } from "./connection";
import { apiFor } from "./data";

export type ConfigStatus = "idle" | "loading" | "ready" | "outdated" | "offline";

interface ConfigState {
  status: ConfigStatus;
  message: string | null;
  categories: Category[];
  /** The user's rules. A user rule with the key of a built-in rule overrides it. */
  userRules: Rule[];
  dirtyCategories: string[];
  dirtyRules: string[];
  deletedRules: string[];
  index: RuleIndex;
  syncing: boolean;

  start: () => Promise<void>;
  flush: () => Promise<void>;
  /** Map an item name to a category (creates or replaces the user's rule). */
  setRule: (name: string, categoryId: string) => void;
  setRuleKind: (key: string, kind: Kind | undefined) => void;
  setAliases: (key: string, aliases: string[]) => void;
  /** Remove a user rule. For a built-in rule this restores the built-in mapping. */
  removeRule: (key: string) => void;
  /** Stop a built-in rule from applying (items become uncategorized). */
  disableBuiltin: (key: string) => void;
  upsertCategory: (c: Partial<Category> & { id: string }) => void;
  /** Only allowed for categories no rule points to. */
  deleteCategory: (id: string) => boolean;
}

const now = () => new Date().toISOString();
const BUILTIN_KEYS = new Set(BUILTIN_RULES.map((r) => r.key));
export const isBuiltinKey = (key: string) => BUILTIN_KEYS.has(key);

function catFromRow(r: CategoryRow, base?: Category): Category {
  return {
    id: r.id,
    name: r.name || base?.name || r.id,
    color: r.color === "" ? null : Number(r.color),
    kind: r.kind === "fixed" ? "fixed" : "variable",
    archived: r.archived === "true",
    order: r.order === "" ? (base?.order ?? 999) : Number(r.order),
    updatedAt: r.updatedAt,
  };
}
function catToRow(c: Category): CategoryRow {
  return {
    id: c.id,
    name: c.name,
    color: c.color === null ? "" : String(c.color),
    kind: c.kind,
    archived: String(c.archived),
    order: String(c.order),
    updatedAt: c.updatedAt ?? now(),
  };
}
function ruleFromRow(r: RuleRow): Rule {
  return {
    id: `u:${r.key}`,
    key: r.key,
    aliases: r.aliases ? r.aliases.split(",").map((a) => normalizeName(a)).filter(Boolean) : [],
    categoryId: r.categoryId || UNCATEGORIZED,
    kind: r.kind === "fixed" || r.kind === "variable" ? r.kind : undefined,
    origin: "user",
    updatedAt: r.updatedAt,
  };
}
function ruleToRow(r: Rule): RuleRow {
  return {
    key: r.key,
    aliases: r.aliases.join(", "),
    categoryId: r.categoryId,
    kind: r.kind ?? "",
    updatedAt: r.updatedAt ?? now(),
  };
}

function index(categories: Category[], userRules: Rule[]) {
  return buildIndex([...BUILTIN_RULES, ...userRules], categories);
}

const uniq = (xs: string[]) => [...new Set(xs)];
let generation = 0;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

export const useConfig = create<ConfigState>((set, get) => {
  function persist() {
    const s = get();
    const cfg: StoredConfig = {
      source: useConnection.getState().source,
      categories: s.categories,
      userRules: s.userRules,
      dirtyCategories: s.dirtyCategories,
      dirtyRules: s.dirtyRules,
      deletedRules: s.deletedRules,
    };
    void saveLocal(cfg).catch(() => {});
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => void get().flush(), 400);
  }

  function update(patch: Partial<ConfigState>) {
    const next = { ...get(), ...patch };
    set({ ...patch, index: index(next.categories, next.userRules) });
    persist();
  }

  function putRule(rule: Rule) {
    const s = get();
    update({
      userRules: [...s.userRules.filter((r) => r.key !== rule.key), { ...rule, updatedAt: now() }],
      dirtyRules: uniq([...s.dirtyRules, rule.key]),
      deletedRules: s.deletedRules.filter((k) => k !== rule.key),
    });
  }

  return {
    status: "idle",
    message: null,
    categories: BUILTIN_CATEGORIES,
    userRules: [],
    dirtyCategories: [],
    dirtyRules: [],
    deletedRules: [],
    index: index(BUILTIN_CATEGORIES, []),
    syncing: false,

    start: async () => {
      const gen = ++generation;
      const { source } = useConnection.getState();
      const reset = {
        categories: BUILTIN_CATEGORIES,
        userRules: [] as Rule[],
        dirtyCategories: [] as string[],
        dirtyRules: [] as string[],
        deletedRules: [] as string[],
      };
      set({ ...reset, index: index(BUILTIN_CATEGORIES, []), status: source === "none" ? "idle" : "loading", message: null });
      if (source === "none") return;

      let local: StoredConfig | null = null;
      try {
        local = await loadConfig(source);
      } catch {
        /* no local copy */
      }
      if (gen !== generation) return;
      if (local) {
        set({
          categories: local.categories,
          userRules: local.userRules,
          dirtyCategories: local.dirtyCategories,
          dirtyRules: local.dirtyRules,
          deletedRules: local.deletedRules,
          index: index(local.categories, local.userRules),
        });
      }

      const api = apiFor(useConnection.getState());
      if (!api) return;
      try {
        const remote = await api.getConfig();
        if (gen !== generation) return;
        const s = get();
        // Sheet is the truth, except for changes made here that haven't been saved yet.
        const byId = new Map(BUILTIN_CATEGORIES.map((c) => [c.id, c]));
        for (const row of remote.categories) byId.set(row.id, catFromRow(row, byId.get(row.id)));
        for (const id of s.dirtyCategories) {
          const mine = s.categories.find((c) => c.id === id);
          if (mine) byId.set(id, mine);
        }
        const rules = new Map(remote.rules.map((r) => [r.key, ruleFromRow(r)]));
        for (const k of s.deletedRules) rules.delete(k);
        for (const k of s.dirtyRules) {
          const mine = s.userRules.find((r) => r.key === k);
          if (mine) rules.set(k, mine);
        }
        const categories = [...byId.values()].sort((a, b) => a.order - b.order);
        const userRules = [...rules.values()];
        set({ categories, userRules, index: index(categories, userRules), status: "ready", message: null });
        persist();
      } catch (e) {
        if (gen !== generation) return;
        set({
          status: isOutdatedBackend(e) ? "outdated" : "offline",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },

    flush: async () => {
      const s = get();
      if (s.syncing || s.status === "outdated") return;
      if (!s.dirtyCategories.length && !s.dirtyRules.length && !s.deletedRules.length) return;
      const api = apiFor(useConnection.getState());
      if (!api) return;
      const gen = generation;
      const sent = { cats: s.dirtyCategories, rules: s.dirtyRules, deleted: s.deletedRules };
      set({ syncing: true });
      try {
        await api.saveConfig({
          categories: s.categories.filter((c) => sent.cats.includes(c.id)).map(catToRow),
          rules: s.userRules.filter((r) => sent.rules.includes(r.key)).map(ruleToRow),
          deleteRules: sent.deleted,
        });
        if (gen !== generation) return;
        const after = get();
        // Keep anything changed again while this request was in flight.
        set({
          dirtyCategories: after.dirtyCategories.filter((id) => !sent.cats.includes(id)),
          dirtyRules: after.dirtyRules.filter((k) => !sent.rules.includes(k)),
          deletedRules: after.deletedRules.filter((k) => !sent.deleted.includes(k)),
          status: "ready",
          message: null,
        });
        persist();
      } catch (e) {
        if (gen !== generation) return;
        const outdatedBackend = isOutdatedBackend(e);
        set({
          status: outdatedBackend ? "outdated" : "offline",
          message: e instanceof Error ? e.message : String(e),
        });
        if (!outdatedBackend) {
          clearTimeout(flushTimer);
          flushTimer = setTimeout(() => void get().flush(), 15_000);
        }
      } finally {
        set({ syncing: false });
      }
    },

    setRule: (name, categoryId) => {
      const key = normalizeName(name);
      if (!key) return;
      const existing = get().userRules.find((r) => r.key === key);
      putRule({
        id: `u:${key}`,
        key,
        aliases: existing?.aliases ?? [],
        categoryId,
        kind: existing?.kind,
        origin: "user",
      });
    },

    setRuleKind: (key, kind) => {
      const s = get();
      const existing = s.userRules.find((r) => r.key === key);
      const builtin = BUILTIN_RULES.find((r) => r.key === key);
      const base = existing ?? (builtin ? { ...builtin, id: `u:${key}`, origin: "user" as const } : null);
      if (!base) return;
      putRule({ ...base, kind });
    },

    setAliases: (key, aliases) => {
      const s = get();
      const existing = s.userRules.find((r) => r.key === key);
      const builtin = BUILTIN_RULES.find((r) => r.key === key);
      const base = existing ?? (builtin ? { ...builtin, id: `u:${key}`, origin: "user" as const } : null);
      if (!base) return;
      putRule({ ...base, aliases: uniq(aliases.map(normalizeName).filter((a) => a && a !== key)) });
    },

    removeRule: (key) => {
      const s = get();
      if (!s.userRules.some((r) => r.key === key)) return;
      update({
        userRules: s.userRules.filter((r) => r.key !== key),
        dirtyRules: s.dirtyRules.filter((k) => k !== key),
        deletedRules: uniq([...s.deletedRules, key]),
      });
    },

    disableBuiltin: (key) => {
      const builtin = BUILTIN_RULES.find((r) => r.key === key);
      if (!builtin) return;
      putRule({ ...builtin, id: `u:${key}`, origin: "user", categoryId: UNCATEGORIZED, aliases: [] });
    },

    upsertCategory: (c) => {
      const s = get();
      const existing = s.categories.find((x) => x.id === c.id);
      const next: Category = {
        id: c.id,
        name: c.name ?? existing?.name ?? c.id,
        color: c.color !== undefined ? c.color : (existing?.color ?? null),
        kind: c.kind ?? existing?.kind ?? "variable",
        archived: c.archived ?? existing?.archived ?? false,
        order: c.order ?? existing?.order ?? Math.max(0, ...s.categories.map((x) => x.order)) + 1,
        updatedAt: now(),
      };
      update({
        categories: existing ? s.categories.map((x) => (x.id === c.id ? next : x)) : [...s.categories, next],
        dirtyCategories: uniq([...s.dirtyCategories, c.id]),
      });
    },

    deleteCategory: (id) => {
      const s = get();
      const used =
        s.userRules.some((r) => r.categoryId === id) ||
        BUILTIN_RULES.some((r) => r.categoryId === id && !s.userRules.some((u) => u.key === r.key));
      if (used || BUILTIN_CATEGORIES.some((c) => c.id === id)) return false;
      // Removing archives it: the row stays in the sheet so other devices hide it too.
      get().upsertCategory({ id, archived: true });
      return true;
    },
  };
});

/** Turn a typed name into a new category id: "Eating out" → "eating-out". */
export function categoryIdFor(name: string, taken: string[]): string {
  const base = name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "category";
  let id = base;
  for (let i = 2; taken.includes(id); i++) id = `${base}-${i}`;
  return id;
}
