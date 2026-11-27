import { findRule, UNCATEGORIZED } from "@/core";
import { ApiError } from "@/data/api";
import { clearCache, db } from "@/data/db";
import { sampleApi } from "@/data/sample";
import { useConnection } from "./connection";
import { useConfig } from "./config";

const C = () => useConfig.getState();
const catOf = (name: string) => findRule(C().index, name)?.categoryId ?? UNCATEGORIZED;

async function fresh() {
  await clearCache(true);
  await (await db()).clear("config");
  localStorage.clear();
  useConnection.getState().set({ source: "sample", scriptUrl: "", token: "" });
  // The sample "sheet" is shared for the session; clear its settings.
  const api = sampleApi();
  const cfg = await api.getConfig();
  await api.saveConfig({ deleteRules: cfg.rules.map((r) => r.key) });
  await C().start();
}

describe("config store", () => {
  beforeEach(fresh);

  it("starts from the built-in categories and rules", () => {
    expect(C().status).toBe("ready");
    expect(C().categories.find((c) => c.id === "groceries")).toBeTruthy();
    expect(catOf("nasta")).toBe("food");
    expect(catOf("aam")).toBe(UNCATEGORIZED);
  });

  it("a new rule applies at once and is saved to the sheet", async () => {
    C().setRule("Aam", "groceries");
    expect(catOf("aam")).toBe("groceries");
    expect(C().dirtyRules).toEqual(["aam"]);
    await C().flush();
    expect(C().dirtyRules).toEqual([]);
    expect((await sampleApi().getConfig()).rules).toMatchObject([{ key: "aam", categoryId: "groceries" }]);
  });

  it("loads rules saved from another device", async () => {
    await sampleApi().saveConfig({ rules: [{ key: "fish", aliases: "mach2", categoryId: "groceries", kind: "", updatedAt: "2026-11-27T00:00:00Z" }] });
    await C().start();
    expect(catOf("fish")).toBe("groceries");
    expect(catOf("mach2")).toBe("groceries");
  });

  it("overrides a built-in rule, and resetting restores it", async () => {
    C().setRule("vara", "work");
    expect(catOf("vara")).toBe("work");
    C().removeRule("vara");
    expect(catOf("vara")).toBe("transport");
    await C().flush();
    expect((await sampleApi().getConfig()).rules.find((r) => r.key === "vara")).toBeUndefined();
  });

  it("can turn a built-in rule off", () => {
    C().disableBuiltin("cover");
    expect(catOf("cover")).toBe(UNCATEGORIZED);
  });

  it("sets kind overrides and alternate spellings", () => {
    C().setRuleKind("recharge", "fixed");
    expect(findRule(C().index, "recharge")?.kind).toBe("fixed");
    C().setAliases("tormuz", ["tormuj", "Watermelon"]);
    expect(catOf("watermelon")).toBe("groceries");
  });

  it("adds, edits and removes categories; refuses to remove one that rules use", () => {
    C().upsertCategory({ id: "eating-out", name: "Eating out", color: null, kind: "variable", archived: false });
    C().setRule("kabab", "eating-out");
    expect(catOf("kabab")).toBe("eating-out");
    expect(C().deleteCategory("eating-out")).toBe(false);
    C().setRule("kabab", "food");
    expect(C().deleteCategory("eating-out")).toBe(true);
    expect(C().categories.find((c) => c.id === "eating-out")?.archived).toBe(true);
    expect(C().deleteCategory("food")).toBe(false);
  });

  it("keeps changes on the device when the deployment is out of date, and syncs them later", async () => {
    const api = sampleApi();
    const real = api.saveConfig;
    api.saveConfig = vi.fn(async () => {
      throw new ApiError("OUTDATED", "out of date");
    });
    C().setRule("milk", "groceries");
    await C().flush();
    expect(C().status).toBe("outdated");
    expect(C().dirtyRules).toEqual(["milk"]);

    // Reload: still there, and it syncs once the backend supports it.
    api.saveConfig = real;
    await C().start();
    expect(catOf("milk")).toBe("groceries");
    await C().flush();
    expect(C().dirtyRules).toEqual([]);
    expect((await api.getConfig()).rules.some((r) => r.key === "milk")).toBe(true);
  });

  it("local unsynced changes win over the sheet on reload", async () => {
    C().setRule("aam", "food");
    await sampleApi().saveConfig({ rules: [{ key: "aam", aliases: "", categoryId: "groceries", kind: "", updatedAt: "2026-01-01T00:00:00Z" }] });
    await C().start();
    expect(catOf("aam")).toBe("food");
  });
});
