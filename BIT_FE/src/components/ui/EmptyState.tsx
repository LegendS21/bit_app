import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "brand",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "brand" | "danger" | "neutral";
}) {
  const color =
    tone === "danger"
      ? "text-rose-500 bg-rose-50"
      : tone === "neutral"
        ? "text-slate-400 bg-slate-100"
        : "text-brand-500 bg-brand-50";

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div
        className={`mb-4 flex h-20 w-20 items-center justify-center rounded-2xl ${color}`}
      >
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xl text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
