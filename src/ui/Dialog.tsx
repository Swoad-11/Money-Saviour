import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native <dialog>: focus trap, Escape to close and inert background come for free. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal?.();
      // showModal focuses the first focusable element (the close button); move focus
      // to the field marked data-autofocus instead.
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
      className={`m-auto w-[calc(100%-32px)] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40 ${
        wide ? "max-w-3xl" : "max-w-lg"
      }`}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"
            >
              <X size={16} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
