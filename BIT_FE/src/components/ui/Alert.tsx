import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type Tone = "info" | "success" | "warning" | "danger" | "brand";

const STYLE: Record<Tone, { box: string; icon: LucideIcon; color: string }> = {
  info: {
    box: "bg-sky-50 border-sky-200",
    icon: Info,
    color: "text-sky-600",
  },
  brand: {
    box: "bg-brand-50 border-brand-200",
    icon: Info,
    color: "text-brand-600",
  },
  success: {
    box: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
    color: "text-emerald-600",
  },
  warning: {
    box: "bg-amber-50 border-amber-200",
    icon: AlertTriangle,
    color: "text-amber-600",
  },
  danger: {
    box: "bg-rose-50 border-rose-200",
    icon: XCircle,
    color: "text-rose-600",
  },
};

export default function Alert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const s = STYLE[tone];
  const Icon = s.icon;
  return (
    <div
      className={`flex flex-wrap items-start gap-4 rounded-xl border p-4 sm:flex-nowrap ${s.box}`}
      role="alert"
    >
      <Icon className={`mt-0.5 shrink-0 ${s.color}`} size={24} />
      <div className="min-w-0 grow">
        {title && (
          <p className="font-bold text-slate-800">{title}</p>
        )}
        {children && (
          <div className="text-sm text-slate-600">{children}</div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
