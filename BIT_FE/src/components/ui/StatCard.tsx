import type { LucideIcon } from "lucide-react";

type Tone = "brand" | "info" | "success" | "danger" | "warning" | "neutral";

const TONE: Record<Tone, string> = {
  brand: "from-brand-500 to-brand-700",
  info: "from-sky-500 to-sky-600",
  success: "from-emerald-500 to-emerald-600",
  danger: "from-rose-500 to-rose-600",
  warning: "from-amber-400 to-amber-500",
  neutral: "from-slate-500 to-slate-600",
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  hint,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-linear-to-br ${TONE[tone]} p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white/80">
            {label}
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-white/75">{hint}</p>}
        </div>
        {Icon && (
          <Icon size={42} className="shrink-0 opacity-30" strokeWidth={1.5} />
        )}
      </div>
      <div className="absolute -right-6 -bottom-8 h-24 w-24 rounded-full bg-white/10" />
    </div>
  );
}
