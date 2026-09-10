import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type Size = "md" | "lg" | "xl";

const SIZE: Record<Size, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
};

/**
 * Modal ringan pengganti modal Bootstrap pada mockup.
 * Dipakai untuk form pendek (detail program, CRUD master, konfirmasi).
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = "md",
  tone = "brand",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  size?: Size;
  tone?: "brand" | "neutral" | "success";
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const head =
    tone === "neutral"
      ? "bg-slate-600"
      : tone === "success"
        ? "bg-emerald-600"
        : "bg-linear-to-r from-brand-600 to-brand-700";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px] sm:p-6">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative my-4 w-full ${SIZE[size]} overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        <div
          className={`flex items-start justify-between gap-4 px-5 py-4 text-white ${head}`}
        >
          <div className="flex items-center gap-3">
            {icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                {icon}
              </span>
            )}
            <div>
              <h2 className="text-base font-bold">{title}</h2>
              {subtitle && (
                <p className="text-xs text-white/70">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="cursor-pointer rounded-md p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
