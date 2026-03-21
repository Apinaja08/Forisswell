import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function DashboardPage() {
  const { user } = useAuth();

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-semibold">Welcome, {user?.fullName || "User"}</h1>
        <p className="mt-1 text-slate-600">
          This is the Assignment 2 frontend starter connected to your backend API.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/trees" className="card hover:border-brand-600">
          <h2 className="font-semibold">Trees</h2>
          <p className="text-sm text-slate-600">CRUD + filters</p>
        </Link>
        <Link to="/events" className="card hover:border-brand-600">
          <h2 className="font-semibold">Events</h2>
          <p className="text-sm text-slate-600">Pagination + search</p>
        </Link>
        <Link to="/alerts" className="card hover:border-brand-600">
          <h2 className="font-semibold">Alerts</h2>
          <p className="text-sm text-slate-600">Volunteer alerts flow</p>
        </Link>
        <Link to="/profile" className="card hover:border-brand-600">
          <h2 className="font-semibold">Profile</h2>
          <p className="text-sm text-slate-600">Session + role info</p>
        </Link>
      </div>
    </section>
  );
}

export default DashboardPage;
