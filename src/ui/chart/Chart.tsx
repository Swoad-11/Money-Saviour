import { useEffect, useRef } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";

ChartJS.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
);

/**
 * Thin Chart.js wrapper. The container height includes the x-axis band, so
 * labels never get clipped. `label` describes the chart for screen readers;
 * the same values are always available in a table elsewhere on the page.
 */
export function Chart({
  config,
  height,
  label,
}: {
  config: ChartConfiguration;
  height: number;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const chart = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvas.current) return;
    chart.current?.destroy();
    chart.current = new ChartJS(canvas.current, config);
    return () => {
      chart.current?.destroy();
      chart.current = null;
    };
  }, [config]);

  return (
    <div style={{ height }} className="relative">
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  );
}

/** Legend that mirrors the marks: rect for bars, line for lines. Text in ink, never in the series color. */
export function Legend({ items }: { items: { label: string; color: string; shape: "rect" | "line" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={i.shape === "rect" ? "size-2.5 rounded-sm" : "h-0.5 w-4 rounded-full"}
            style={{ background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
