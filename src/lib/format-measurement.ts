import type { RecordStr } from "./recipe-types";

export function formatMeasurement(m: RecordStr | undefined): string {
  if (!m) return "";
  const amount = m.amount;
  const unit = typeof m.unit === "string" ? m.unit : "";
  let n: number;
  if (typeof amount === "number" && Number.isFinite(amount)) {
    n = amount;
  } else if (typeof amount === "string") {
    const p = parseFloat(amount);
    n = Number.isFinite(p) ? p : 0;
  } else {
    n = 0;
  }
  const rounded =
    Math.abs(n - Math.round(n)) < 1e-9
      ? String(Math.round(n))
      : n >= 10
        ? n.toFixed(1).replace(/\.0$/, "")
        : n.toFixed(2).replace(/\.?0+$/, "");
  if (!unit) return rounded;
  return `${rounded} ${unit}`;
}
