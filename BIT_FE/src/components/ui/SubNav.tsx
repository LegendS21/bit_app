import { NavLink } from "react-router-dom";

/** Tab navigasi antar halaman bersaudara (Data Master, Setting System). */
export default function SubNav({
  items,
}: {
  items: { to: string; label: string }[];
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          className={({ isActive }) =>
            `rounded-lg px-4 py-2 text-sm font-bold transition ${
              isActive
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`
          }
        >
          {i.label}
        </NavLink>
      ))}
    </div>
  );
}
