import { UNCATEGORIZED } from "@/core";
import { useConfig } from "@/state/config";

/** Dropdown of active categories (plus the current one if it's archived). */
export function CategorySelect({
  value,
  onChange,
  label,
  allowNone = true,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
  allowNone?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const categories = useConfig((s) => s.categories);
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 min-w-0 rounded-md border border-line bg-surface px-2 text-[13px] text-ink ${className}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {allowNone && <option value={UNCATEGORIZED}>Uncategorized</option>}
      {categories
        .filter((c) => !c.archived || c.id === value)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </select>
  );
}
