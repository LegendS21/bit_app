import { Check } from "lucide-react";

/**
 * Indikator langkah wizard pendaftaran (4 tahap).
 * `onSelect` opsional — dipakai saat form dalam mode baca/revisi
 * sehingga pengguna boleh melompat antar tahap.
 */
export default function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: string[];
  current: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <ol className="grid gap-px overflow-hidden rounded-t-xl bg-slate-200 sm:grid-cols-4">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = Boolean(onSelect);

        return (
          <li key={label}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onSelect?.(i)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                clickable ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
              } ${
                active
                  ? "bg-white"
                  : done
                    ? "bg-emerald-50/60"
                    : "bg-slate-50"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-brand-600 text-white"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {done ? <Check size={16} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[11px] font-semibold tracking-wide uppercase ${
                    active
                      ? "text-brand-600"
                      : done
                        ? "text-emerald-600"
                        : "text-slate-400"
                  }`}
                >
                  Langkah {i + 1}
                </span>
                <span
                  className={`block truncate text-sm font-bold ${
                    active ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
