import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Badge from "../ui/Badge";
import { cx } from "../../utils/cx";
import brandLogo from "../../assets/logoForrizwell.png";

const roleTone = {
  admin: "info",
  volunteer: "warning",
  user: "leaf",
};

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const authNav = useMemo(
    () => {
      const baseNav = [
        { to: "/dashboard", label: "Dashboard" },
      ];

      // Hide Trees and Alerts for admins - they have their own admin panel
      if (user?.role !== "admin") {
        baseNav.push({ to: "/trees", label: "Trees" });
      }

      baseNav.push({ to: "/events", label: "Events" });
      baseNav.push({ to: "/profile", label: "Profile" });

      // Add Alerts for volunteers only (not admins)
      if (user?.role === "volunteer") {
        baseNav.splice(3, 0, { to: "/alerts", label: "Alerts" });
      }

      // Add Admin Panel for admins (at start after dashboard)
      if (user?.role === "admin") {
        baseNav.splice(1, 0, { to: "/admin", label: "Admin Panel" });
      }

      return baseNav;
    },
    [user?.role]
  );

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navClass = ({ isActive }) =>
    cx(
      "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
      isActive
        ? "bg-leaf-100 text-leaf-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    );

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur-xl">
      <div className="app-container">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={brandLogo}
              alt="Forisswell logo"
              className="h-10 w-10 rounded-xl object-cover shadow-card ring-1 ring-slate-200"
            />
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Forisswell</p>
              <p className="text-xs text-slate-500">Tree Care Intelligence</p>
            </div>
          </Link>

          <button
            className="btn-secondary md:hidden"
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            Menu
          </button>

          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                <nav className="flex items-center gap-1">
                  {authNav.map((item) => (
                    <NavLink key={item.to} to={item.to} className={navClass}>
                      {item.label}
                    </NavLink>
                  ))}
                </nav>

                <div className="ml-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{user?.fullName || user?.email}</p>
                    <p className="text-[11px] text-slate-500">Signed in</p>
                  </div>
                  <Badge variant={roleTone[user?.role] || "neutral"}>{user?.role || "user"}</Badge>
                </div>

                <button className="btn-secondary" onClick={handleLogout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <nav className="flex items-center gap-1">
                  <NavLink className={navClass} to="/">
                    Home
                  </NavLink>
                  <a className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900" href="#features">
                    Features
                  </a>

                </nav>
                <Link to="/login" className="btn-ghost">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>

        <div className={cx("pb-4 md:hidden", open ? "block" : "hidden")}>
          {isAuthenticated ? (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{user?.fullName || user?.email}</p>
                <Badge variant={roleTone[user?.role] || "neutral"}>{user?.role || "user"}</Badge>
              </div>
              {authNav.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
              <button className="btn-secondary mt-2 w-full" onClick={handleLogout} type="button">
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <NavLink className={navClass} to="/">
                Home
              </NavLink>
              <Link className="btn-secondary w-full" to="/login">
                Login
              </Link>
              <Link className="btn-primary w-full" to="/register">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
