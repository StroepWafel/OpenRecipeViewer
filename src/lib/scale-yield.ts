import type { RecordStr } from "./recipe-types";
import { asMeasurement } from "./recipe-types";

export function parseBaseYieldAmount(
  baseYield: RecordStr | undefined
): number {
  if (!baseYield) return 1;
  const base = baseYield.amount;
  const bn =
    typeof base === "number" && Number.isFinite(base)
      ? base
      : typeof base === "string"
        ? parseFloat(base)
        : NaN;
  if (!Number.isFinite(bn) || bn <= 0) return 1;
  return bn;
}

/**
 * Scale factor from base_yield to a target output amount (same unit family as base_yield).
 * ORS: multiply each ingredient amount by (target / base_yield.amount) when comparable.
 */
export function scaleFactorFromBaseYield(
  baseYield: RecordStr | undefined,
  targetAmount: number
): number {
  if (!baseYield) return 1;
  const bn = parseBaseYieldAmount(baseYield);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return 1;
  return targetAmount / bn;
}

export function scaledAmount(
  measurement: RecordStr | undefined,
  factor: number
): number | undefined {
  if (!measurement || factor === 1) return undefined;
  const a = measurement.amount;
  const n =
    typeof a === "number" && Number.isFinite(a)
      ? a
      : typeof a === "string"
        ? parseFloat(a)
        : NaN;
  if (!Number.isFinite(n)) return undefined;
  return n * factor;
}

export function formatScaledIngredientLine(
  ing: RecordStr,
  factor: number
): { primary: string; note?: string } {
  const name = typeof ing.name === "string" ? ing.name : "Ingredient";
  const amt = asMeasurement(ing.amount);
  if (!amt || factor === 1) {
    const raw = amt ? formatAmt(amt) : "";
    return { primary: raw ? `${raw} ${name}` : name };
  }
  const sn = scaledAmount(amt, factor);
  if (sn === undefined) {
    return { primary: `${formatAmt(amt)} ${name}` };
  }
  const rounded = formatNumber(sn);
  const unit = typeof amt.unit === "string" ? amt.unit : "";
  const scaled = unit ? `${rounded} ${unit}` : rounded;
  const orig = `${formatAmt(amt)} ${unit}`.trim();
  return {
    primary: `${scaled} ${name}`,
    note: orig !== scaled ? `was ${orig}` : undefined,
  };
}

function formatAmt(m: RecordStr): string {
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
  const rounded = formatNumber(n);
  return unit ? `${rounded} ${unit}` : rounded;
}

function formatNumber(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, "");
  return n.toFixed(2).replace(/\.?0+$/, "");
}
