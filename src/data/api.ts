import { z } from "zod";
import {
  EnvelopeSchema,
  PingSchema,
  SheetMonthSchema,
  WorkbookSchema,
  type Ping,
  type SheetMonth,
  type Workbook,
} from "./schema";

export type ApiErrorCode = "NETWORK" | "AUTH" | "BAD_REQUEST" | "SERVER" | "BAD_RESPONSE";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

export interface Api {
  ping(): Promise<Ping>;
  getWorkbook(): Promise<Workbook>;
  getMonths(tabs?: string[]): Promise<SheetMonth[]>;
}

export interface Connection {
  scriptUrl: string;
  token: string;
}

const SCRIPT_URL = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;

export function validateScriptUrl(url: string): string | null {
  return SCRIPT_URL.test(url.trim())
    ? null
    : "Paste the Web app URL from Deploy > Manage deployments. It ends in /exec.";
}

export function createHttpApi(conn: Connection, fetchImpl: typeof fetch = fetch): Api {
  async function call<T>(action: string, schema: z.ZodType<T>, params?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(conn.scriptUrl.trim(), {
        method: "POST",
        // text/plain keeps this a "simple" request, so the browser skips the CORS preflight
        // that Apps Script can't answer.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token: conn.token, action, params }),
        redirect: "follow",
      });
    } catch {
      throw new ApiError("NETWORK", "Can't reach Google Apps Script. Check your connection.");
    }
    if (!res.ok) {
      throw new ApiError(
        res.status === 404 ? "BAD_REQUEST" : "SERVER",
        res.status === 404
          ? "No deployment at this URL. Check the Web app URL in Settings."
          : `Apps Script answered with HTTP ${res.status}.`,
      );
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new ApiError(
        "BAD_RESPONSE",
        "The response wasn't JSON. The deployment may need access set to “Anyone”.",
      );
    }
    const env = EnvelopeSchema.safeParse(json);
    if (!env.success) throw new ApiError("BAD_RESPONSE", "Unexpected response from Apps Script.");
    if (!env.data.ok) {
      const { code, message } = env.data.error;
      const known: ApiErrorCode[] = ["AUTH", "BAD_REQUEST", "SERVER"];
      throw new ApiError(known.includes(code as ApiErrorCode) ? (code as ApiErrorCode) : "SERVER", message);
    }
    const data = schema.safeParse(env.data.data);
    if (!data.success) throw new ApiError("BAD_RESPONSE", `Unexpected data for ${action}.`);
    return data.data;
  }

  return {
    ping: () => call("ping", PingSchema),
    getWorkbook: () => call("getWorkbook", WorkbookSchema),
    getMonths: (tabs) => call("getMonths", z.array(SheetMonthSchema), tabs ? { tabs } : undefined),
  };
}

/** 32 random bytes as URL-safe base64: the value for the MS_TOKEN script property. */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
