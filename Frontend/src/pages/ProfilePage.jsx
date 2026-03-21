import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";

const roleTone = {
  admin: "info",
  volunteer: "warning",
  user: "leaf",
};

const roleHighlights = {
  admin: [
    "System-wide monitoring access",
    "Admin analytics and leaderboard visibility",
    "Operational control over alerts and events",
  ],
  volunteer: [
    "Volunteer profile and availability controls",
    "Nearby alert participation workflow",
    "Contribution and performance tracking",
  ],
  user: [
    "Tree and weather monitoring views",
    "Alert visibility for owned resources",
    "Community events discovery and participation",
  ],
};

function ProfilePage() {
  const { user } = useAuth();
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await api.get("/auth/me");
        setLatest(response.data.data?.user || null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const profile = latest || user;
  const role = profile?.role || "user";

  return (
    <section className="space-y-6">
      <Card className="border-leaf-100 bg-white/90">
        <SectionHeader
          title="Profile"
          subtitle="Your authenticated identity, role permissions, and session context."
          right={<Badge variant={roleTone[role] || "neutral"}>{role}</Badge>}
        />
      </Card>

      {loading ? <LoadingSpinner label="Loading profile..." /> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <h2 className="text-lg font-semibold">Account Details</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Name:</span> {profile?.fullName || "-"}</p>
              <p><span className="font-semibold text-slate-900">Email:</span> {profile?.email || "-"}</p>
              <p><span className="font-semibold text-slate-900">Role:</span> {profile?.role || "-"}</p>
              <p><span className="font-semibold text-slate-900">Session:</span> Active</p>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold">Role Capabilities</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {(roleHighlights[role] || roleHighlights.user).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-leaf-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

export default ProfilePage;
