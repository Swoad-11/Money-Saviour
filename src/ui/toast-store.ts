import { create } from "zustand";

interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

let nextId = 1;

export const useToast = create<{ toast: Toast | null; show: (t: Omit<Toast, "id">) => void; hide: () => void }>(
  (set) => ({
    toast: null,
    show: (t) => set({ toast: { ...t, id: nextId++ } }),
    hide: () => set({ toast: null }),
  }),
);
