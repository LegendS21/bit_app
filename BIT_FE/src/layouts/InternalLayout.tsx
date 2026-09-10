import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Database,
  FileCheck2,
  FileSpreadsheet,
  LayoutDashboard,
  ListTree,
  LogOut,
  Menu as MenuIcon,
  MessagesSquare,
  Settings2,
  ShieldCheck,
  ShieldHalf,
  Trophy,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "../features/auth/authSlice";
import { useAppDispatch, useAuth } from "../store/hooks";

type MenuItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
type MenuGroup = { judul: string; items: MenuItem[] };

type Peran = {
  key: "verifikator" | "seleksi" | "admin";
  nama: string;
  sub: string;
  /** Awalan badge; nama pemakainya diambil dari sesi login. */
  sapaan: string;
  icon: LucideIcon;
  home: string;
  groups: MenuGroup[];
};

const PERAN: Peran[] = [
  {
    key: "verifikator",
    nama: "PORTAL VERIFIKATOR",
    sub: "Beasiswa App",
    sapaan: "Verifikator",
    icon: ShieldCheck,
    home: "/verifikator",
    groups: [
      {
        judul: "Menu Utama",
        items: [
          {
            to: "/verifikator",
            label: "Verifikasi Seleksi Administrasi",
            icon: FileCheck2,
            end: true,
          },
        ],
      },
    ],
  },
  {
    key: "seleksi",
    nama: "LEMBAGA SELEKSI",
    sub: "Beasiswa App",
    sapaan: "Tim Penguji",
    icon: Trophy,
    home: "/lembaga-seleksi",
    groups: [
      {
        judul: "Menu Utama",
        items: [
          {
            to: "/lembaga-seleksi",
            label: "Proses Wawancara",
            icon: MessagesSquare,
            end: true,
          },
        ],
      },
    ],
  },
  {
    key: "admin",
    nama: "ADMINISTRATOR",
    sub: "Portal Beasiswa",
    sapaan: "Admin",
    icon: Settings2,
    home: "/admin",
    groups: [
      {
        judul: "Menu Utama",
        items: [
          {
            to: "/admin",
            label: "Dashboard",
            icon: LayoutDashboard,
            end: true,
          },
          {
            to: "/admin/hasil-seleksi",
            label: "Hasil Seleksi",
            icon: FileSpreadsheet,
          },
        ],
      },
      {
        judul: "Data Master",
        items: [
          {
            to: "/admin/master/beasiswa",
            label: "Data Beasiswa",
            icon: Database,
          },
          {
            to: "/admin/master/persyaratan",
            label: "Data Persyaratan",
            icon: ListTree,
          },
        ],
      },
      {
        judul: "Setting System",
        items: [
          { to: "/admin/pengaturan/users", label: "Users Internal", icon: Users },
          {
            to: "/admin/pengaturan/role",
            label: "Role & Akses Menu",
            icon: ShieldHalf,
          },
          {
            to: "/admin/pengaturan/menu",
            label: "Menu System",
            icon: UserCog,
          },
        ],
      },
    ],
  },
];

function peranDariPath(path: string): Peran {
  if (path.startsWith("/lembaga-seleksi")) return PERAN[1];
  if (path.startsWith("/admin")) return PERAN[2];
  return PERAN[0];
}

export default function InternalLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  // Menu mengikuti area yang sedang dibuka; aksesnya sendiri sudah dijaga
  // RequireAuth per peran di routes/index.tsx.
  const peran = peranDariPath(pathname);
  const BrandIcon = peran.icon;
  const badge = `${peran.sapaan}: ${user?.nama ?? "-"}`;

  async function keluar() {
    await dispatch(logout());
    navigate("/internal/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---------------- Sidebar ---------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-66 flex-col bg-linear-to-b from-brand-600 to-brand-800 text-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <BrandIcon size={30} className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{peran.nama}</p>
            <p className="text-xs text-white/60">{peran.sub}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="ml-auto cursor-pointer rounded-md p-1 hover:bg-white/15 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-5 border-t border-white/20" />

        <nav className="grow overflow-y-auto px-3 py-4">
          {peran.groups.map((g) => (
            <div key={g.judul} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-bold tracking-widest text-white/45 uppercase">
                {g.judul}
              </p>
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? "bg-white/20 text-white shadow-sm"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`
                        }
                      >
                        <Icon size={18} className="shrink-0" />
                        <span className="min-w-0 leading-tight">
                          {item.label}
                        </span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mx-3 mb-1 rounded-lg bg-white/10 px-3 py-2.5">
          <p className="text-[10px] font-bold tracking-widest text-white/45 uppercase">
            Masuk sebagai
          </p>
          <p className="truncate text-sm font-bold">{user?.nama ?? "-"}</p>
          <p className="truncate text-xs text-white/60">{user?.email}</p>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={keluar}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-rose-500/85 px-3 py-2.5 text-sm font-semibold transition hover:bg-rose-500"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ---------------- Konten ---------------- */}
      <div className="lg:pl-66">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="cursor-pointer rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <MenuIcon size={20} />
          </button>
          <span className="text-sm font-bold text-slate-800">{peran.nama}</span>
        </div>

        <div className="p-4 sm:p-6">
          <Outlet context={{ badge }} />
        </div>
      </div>
    </div>
  );
}
