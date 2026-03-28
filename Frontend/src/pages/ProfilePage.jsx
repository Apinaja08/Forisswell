import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";

const roleTone = {
  admin: "info",
  volunteer: "warning",
  user: "leaf",
};

const roleLabel = {
  admin: "Administrator",
  volunteer: "Volunteer",
  user: "User",
};

const roleSummary = {
  admin: "Platform-wide oversight and operational control.",
  volunteer: "Field response workflows and contribution tracking.",
  user: "Tree monitoring and community participation access.",
};

const roleHighlights = {
  admin: [
    { title: "Monitoring Access", text: "View system-wide alerts, trends, and operations." },
    { title: "Analytics Visibility", text: "Access leaderboard and response performance insights." },
    { title: "Operational Control", text: "Manage high-level alert and event actions." },
  ],
  volunteer: [
    { title: "Profile Controls", text: "Maintain volunteer profile, location, and availability." },
    { title: "Nearby Alerts", text: "Accept and execute alerts in your service radius." },
    { title: "Performance", text: "Track completed tasks and contribution impact." },
  ],
  user: [
    { title: "Tree Monitoring", text: "Track tree data and weather-aware context." },
    { title: "Owned Resource Alerts", text: "Review status around your monitored trees." },
    { title: "Community Events", text: "Discover and participate in ongoing activities." },
  ],
};

const getProfileInitials = (profile) => {
  const name = profile?.fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  const email = profile?.email?.trim();
  if (email) return email.slice(0, 2).toUpperCase();

  return "NA";
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
  const initials = getProfileInitials(profile);
  const capabilities = roleHighlights[role] || roleHighlights.user;
  const detailRows = [
    { label: "Full Name", value: profile?.fullName || "-" },
    { label: "Email Address", value: profile?.email || "-" },
    { label: "Role", value: roleLabel[role] || roleLabel.user },
    { label: "Session", value: "Active" },
    { label: "Profile Source", value: latest ? "Live Server Data" : "Session Cache" },
  ];

  return (
    <section className="space-y-6">
      {loading ? <LoadingSpinner label="Loading profile..." /> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      {!loading && !error ? (
        <div className="space-y-4">
          <Card className="relative overflow-hidden border-leaf-100 bg-white">
            <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-leaf-100/60" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-leaf-600 text-lg font-extrabold text-white shadow-soft">
                  {initials}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Summary</p>
                  <h2 className="text-2xl font-bold text-slate-900">{profile?.fullName || "Member"}</h2>
                  <p className="mt-1 text-sm text-slate-600">{profile?.email || "-"}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={roleTone[role] || "neutral"}>{roleLabel[role] || roleLabel.user}</Badge>
                <Badge variant="success">Session Active</Badge>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <Card>
              <h3 className="text-lg font-semibold text-slate-900">Account Details</h3>
              <p className="mt-1 text-sm text-slate-600">{roleSummary[role] || roleSummary.user}</p>
              <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {detailRows.map((item) => (
                  <div key={item.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="text-sm font-medium text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-slate-900">Role Capabilities</h3>
              <p className="mt-1 text-sm text-slate-600">Features available for your current role.</p>
              <div className="mt-4 space-y-3">
                {capabilities.map((item) => (
                  <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ProfilePage;
