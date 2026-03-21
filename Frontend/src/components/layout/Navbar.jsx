import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="text-lg font-semibold text-brand-700">
          Forisswell
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <nav className="flex gap-3 text-sm">
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/trees">Trees</NavLink>
              <NavLink to="/events">Events</NavLink>
              <NavLink to="/alerts">Alerts</NavLink>
              <NavLink to="/profile">Profile</NavLink>
            </nav>
            <span className="hidden text-sm text-slate-500 sm:block">
              {user?.fullName || user?.email}
            </span>
            <button className="btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <nav className="flex gap-2">
            <Link to="/login" className="btn-secondary">
              Login
            </Link>
            <Link to="/register" className="btn-primary">
              Register
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Navbar;
