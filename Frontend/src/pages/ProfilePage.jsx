import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/common/LoadingSpinner";

function ProfilePage() {
  const { user } = useAuth();
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await api.get("/auth/me");
        setLatest(response.data.data?.user || null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const profile = latest || user;

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-slate-600">Session and current user information.</p>
      </div>

      {loading ? <LoadingSpinner label="Loading profile..." /> : null}

      {!loading ? (
        <div className="card space-y-2">
          <p><span className="font-semibold">Name:</span> {profile?.fullName || "-"}</p>
          <p><span className="font-semibold">Email:</span> {profile?.email || "-"}</p>
          <p><span className="font-semibold">Role:</span> {profile?.role || "-"}</p>
        </div>
      ) : null}
    </section>
  );
}

export default ProfilePage;
