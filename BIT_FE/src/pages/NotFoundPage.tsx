import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Compass, Home } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-brand-50 via-slate-100 to-brand-100 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 text-center shadow-xl shadow-brand-900/10">
        <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Compass size={40} strokeWidth={1.5} />
        </span>
        <p className="text-5xl font-extrabold tracking-tight text-brand-700">
          404
        </p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Alamat yang Anda tuju tidak tersedia atau sudah dipindahkan. Silakan
          kembali ke halaman utama.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-outline"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <Link to="/" className="btn btn-primary">
            <Home size={16} /> Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
