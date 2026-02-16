import { useEffect, useRef, useState } from "react";
import { formatCost } from "../../lib/cost";

export function CostCounter({
  cost,
  burnRate = 0,
  size = "md",
}: {
  cost: number;
  burnRate?: number;
  size?: "sm" | "md" | "lg";
}) {
  const [display, setDisplay] = useState(cost);
  const target = useRef(cost);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    target.current = cost;
    const tick = () => {
      setDisplay((prev) => {
        const diff = target.current - prev;
        if (Math.abs(diff) < 0.0001) return target.current;
        return prev + diff * 0.15;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [cost]);

  const color = burnRate <= 0
    ? "text-sonar-text-secondary"
    : burnRate < 0.01
      ? "text-sonar-accent"
      : burnRate < 0.05
        ? "text-sonar-warning"
        : "text-sonar-danger";

  const fontSize = size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";

  return (
    <span className={`${color} ${fontSize} font-semibold tabular-nums transition-colors duration-500`}>
      {formatCost(display)}
    </span>
  );
}
