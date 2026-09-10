import type { ReactNode } from "react";

export type BadgeTone =
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

const TONE: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-300",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

export default function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`badge ${TONE[tone]} ${className}`}>{children}</span>
  );
}
