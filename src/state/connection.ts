import { create } from "zustand";

export type Source = "none" | "sample" | "sheet";

export interface ConnectionState {
  source: Source;
  scriptUrl: string;
  token: string;
}

const KEY = "ms.connection";
const EMPTY: ConnectionState = { source: "none", scriptUrl: "", token: "" };

function read(): ConnectionState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && (v.source === "sheet" || v.source === "sample" || v.source === "none")) {
      return { source: v.source, scriptUrl: String(v.scriptUrl ?? ""), token: String(v.token ?? "") };
    }
  } catch {
    /* storage unavailable or corrupt */
  }
  return EMPTY;
}

/**
 * Where data comes from. Kept in localStorage on this device only.
 * The token never goes into backups, exports or the sheet.
 */
export const useConnection = create<ConnectionState & { set: (c: ConnectionState) => void }>((set) => ({
  ...read(),
  set: (c) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {
      /* storage unavailable */
    }
    set(c);
  },
}));
