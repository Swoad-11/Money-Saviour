import { ApiError, createHttpApi, generateToken, validateScriptUrl } from "./api";
import { createSampleApi, sampleMonth } from "./sample";
import { clearCache, loadCache, saveCache } from "./db";
import { sheetFormulaTotal } from "@/core/parse";
import { useConnection } from "@/state/connection";
import { useData } from "@/state/data";

const URL_OK = "https://script.google.com/macros/s/AKfyc-abc_123/exec";
const conn = { scriptUrl: URL_OK, token: "x".repeat(43) };
const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("http api", () => {
  it("posts the token and action as text/plain", async () => {
    const f = reply({ ok: true, data: { version: "2", title: "T" } });
    await createHttpApi(conn, f).ping();
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe(URL_OK);
    expect(init.headers["Content-Type"]).toMatch(/^text\/plain/);
    expect(JSON.parse(init.body)).toEqual({ token: conn.token, action: "ping" });
  });

  it("maps backend errors", async () => {
    const f = reply({ ok: false, error: { code: "AUTH", message: "Missing or wrong access token" } });
    await expect(createHttpApi(conn, f).ping()).rejects.toMatchObject({ code: "AUTH" });
  });

  it("explains a dead deployment (404)", async () => {
    const f = vi.fn(async () => new Response("<html>", { status: 404 })) as unknown as typeof fetch;
    await expect(createHttpApi(conn, f).ping()).rejects.toThrow(/No deployment/);
  });

  it("explains an HTML sign-in page instead of JSON", async () => {
    const f = vi.fn(async () => new Response("<html>sign in</html>")) as unknown as typeof fetch;
    await expect(createHttpApi(conn, f).ping()).rejects.toMatchObject({ code: "BAD_RESPONSE" });
  });

  it("reports network failures", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const err = await createHttpApi(conn, f).getWorkbook().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("NETWORK");
  });

  it("rejects malformed data", async () => {
    const f = reply({ ok: true, data: [{ key: "Nov" }] });
    await expect(createHttpApi(conn, f).getMonths()).rejects.toMatchObject({ code: "BAD_RESPONSE" });
  });

  it("validates script URLs and makes long tokens", () => {
    expect(validateScriptUrl(URL_OK)).toBeNull();
    expect(validateScriptUrl("https://example.com/exec")).not.toBeNull();
    expect(generateToken()).toMatch(/^[\w-]{43}$/);
  });
});

describe("sample data", () => {
  it("is deterministic and internally consistent", () => {
    const a = sampleMonth(2026, 3);
    expect(sampleMonth(2026, 3)).toEqual(a);
    for (const d of a.days) expect(d.sheetTotal).toBe(d.raw ? sheetFormulaTotal(d.raw) : null);
    expect(a.sheetGrandTotal).toBe(a.days.reduce((s, d) => s + (d.sheetTotal ?? 0), 0));
  });

  it("only fills days up to today in the current month", async () => {
    const api = createSampleApi(new Date(2026, 10, 10));
    const months = await api.getMonths();
    expect(months).toHaveLength(11);
    const nov = months.at(-1)!;
    expect(nov.days.slice(10).every((d) => d.raw === "")).toBe(true);
  });
});

describe("cache", () => {
  beforeEach(async () => {
    await clearCache();
  });

  it("round-trips and replaces a source's months", async () => {
    const wb = { title: "T", timeZone: "Asia/Dhaka", year: 2026, months: [] };
    await saveCache("sheet", wb, [sampleMonth(2026, 1), sampleMonth(2026, 2)]);
    await saveCache("sheet", wb, [sampleMonth(2026, 2)]);
    await saveCache("sample", wb, [sampleMonth(2026, 5)]);
    const c = await loadCache("sheet");
    expect(c.workbook?.workbook.title).toBe("T");
    expect(c.months.map((m) => m.key)).toEqual(["2026-02"]);
  });
});

describe("data store", () => {
  beforeEach(async () => {
    await clearCache();
    localStorage.clear();
  });

  it("loads sample data and caches it", async () => {
    useConnection.getState().set({ source: "sample", scriptUrl: "", token: "" });
    await useData.getState().start();
    const s = useData.getState();
    expect(s.status).toBe("ready");
    expect(Object.keys(s.months).length).toBeGreaterThan(0);
    expect((await loadCache("sample")).months.length).toBe(Object.keys(s.months).length);
  });

  it("keeps showing cached data when the sheet can't be reached", async () => {
    const wb = { title: "Cached", timeZone: "Asia/Dhaka", year: 2026, months: [{ tab: "January", key: "2026-01" }] };
    await saveCache("sheet", wb, [sampleMonth(2026, 1)]);
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("offline");
    }));
    useConnection.getState().set({ source: "sheet", scriptUrl: URL_OK, token: "x".repeat(43) });
    await useData.getState().start();
    const s = useData.getState();
    expect(s.status).toBe("ready");
    expect(s.workbook?.title).toBe("Cached");
    expect(s.fromCache).toBe(true);
    expect(s.error?.code).toBe("NETWORK");
    vi.unstubAllGlobals();
  });
});
