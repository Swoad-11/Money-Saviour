import { useEffect } from "react";
import { useToast } from "./toast-store";

export function Toaster() {
  const { toast, hide } = useToast();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, 6000);
    return () => clearTimeout(t);
  }, [toast, hide]);
  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-fit max-w-[calc(100%-32px)] items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-[13px] text-bg shadow-lg md:bottom-6"
    >
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="font-semibold text-primary-soft underline-offset-2 hover:underline"
          onClick={() => {
            toast.action!.run();
            hide();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
