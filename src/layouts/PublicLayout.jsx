import { Outlet, Link, useLocation } from "react-router-dom";
import { Scissors } from "lucide-react";

export default function PublicLayout() {
  const { pathname } = useLocation();
  const isBooking = pathname.startsWith("/booking");

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {!isBooking && (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl px-6 md:px-16 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
                <Scissors className="w-4 h-4 text-black" />
              </div>
              <span className="text-lg font-black tracking-tight">NobleCut</span>
            </Link>

            <div className="flex items-center gap-8">
              <a href="#servicios" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                Servicios
              </a>
              <Link to="/booking" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                Domicilio
              </Link>
              <Link
                to="/booking"
                className="px-4 py-2 bg-amber-400 text-black rounded-xl font-bold text-sm hover:bg-amber-300 transition-colors"
              >
                Reservar
              </Link>
            </div>
          </div>
        </nav>
      )}

      <div className={!isBooking ? "pt-16" : ""}>
        <Outlet />
      </div>
    </div>
  );
}
