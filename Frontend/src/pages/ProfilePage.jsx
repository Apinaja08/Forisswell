import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import CoordinatePickerMap from "../components/ui/CoordinatePickerMap";
import SectionHeader from "../components/ui/SectionHeader";

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

const availableSkills = [
  "watering",
  "pruning",
  "mulching",
  "pest_control",
  "first_aid",
  "heavy_lifting",
  "carpentry",
  "photography",
  "documentation",
  "other",
];

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getGeoErrorMessage = (geoError) => {
  const code = geoError?.code;
  const rawMessage = geoError?.message;

  if (!window.isSecureContext) {
    return "Current location needs a secure context. Use HTTPS or open the app on localhost.";
  }

  if (code === 1) {
    return "Location permission denied. Allow location access for this site in your browser settings and try again.";
  }

  if (code === 2) {
    return "Your location is unavailable right now. Check device location services and retry.";
  }

  if (code === 3) {
    return "Location request timed out. Please try again.";
  }

  return rawMessage || "Unable to get your location";
};

const emptyVolunteerForm = {
  phone: "",
  skills: [],
  latitude: "",
  longitude: "",
  preferredRadius: 5,
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
};

function ProfilePage() {
  const { user } = useAuth();
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Volunteer profile states
  const [volunteerProfile, setVolunteerProfile] = useState(null);
  const [volunteerLoading, setVolunteerLoading] = useState(false);
  const [volunteerForm, setVolunteerForm] = useState(emptyVolunteerForm);
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [volunteerError, setVolunteerError] = useState("");
  const [volunteerSuccess, setVolunteerSuccess] = useState("");
  const [submitVolunteerLoading, setSubmitVolunteerLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationDetectingLoading, setLocationDetectingLoading] = useState(false);

  // Volunteer stats and status states
  const [volunteerStats, setVolunteerStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

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

  // Fetch volunteer profile if user is a volunteer
  useEffect(() => {
    const fetchVolunteerProfile = async () => {
      if (user?.role !== "volunteer") return;

      setVolunteerLoading(true);
      try {
        const response = await api.get("/volunteers/profile");
        const profile = response.data.data?.profile;
        if (profile) {
          setVolunteerProfile(profile);
          setVolunteerForm({
            phone: profile.phone || "",
            skills: profile.skills || [],
            latitude: profile.location?.coordinates?.[1]?.toString() || "",
            longitude: profile.location?.coordinates?.[0]?.toString() || "",
            preferredRadius: profile.preferredRadius || 5,
            emergencyContactName: profile.emergencyContact?.name || "",
            emergencyContactPhone: profile.emergencyContact?.phone || "",
            emergencyContactRelationship: profile.emergencyContact?.relationship || "",
          });
        }
      } catch (err) {
        // Profile doesn't exist yet, that's fine
        console.log("No volunteer profile found, user can create one");
      } finally {
        setVolunteerLoading(false);
      }
    };

    fetchVolunteerProfile();
  }, [user?.role]);

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

  // Fetch volunteer stats if volunteer exists
  useEffect(() => {
    const fetchVolunteerStats = async () => {
      if (user?.role !== "volunteer" || !volunteerProfile) return;

      setStatsLoading(true);
      try {
        const response = await api.get("/volunteers/stats");
        const stats = response.data.data?.stats;
        if (stats) {
          setVolunteerStats(stats);
        }
      } catch (err) {
        // Stats might not be available yet
        console.log("No stats available yet");
      } finally {
        setStatsLoading(false);
      }
    };

    fetchVolunteerStats();
  }, [user?.role, volunteerProfile]);

  // Handle volunteer status update
  const handleStatusUpdate = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const response = await api.patch("/volunteers/status", {
        status: newStatus,
      });
      const updatedStatus = response.data.data?.status;
      setVolunteerProfile((prev) => ({
        ...prev,
        status: updatedStatus,
      }));
      setVolunteerSuccess(`Status updated to ${newStatus}`);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to update status";
      setVolunteerError(message);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Volunteer profile handlers
  const handleMapCoordinateSelect = ({ lat, lon }) => {
    setVolunteerForm((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lon.toString(),
    }));
  };

  const handleCurrentLocationForVolunteer = () => {
    if (!navigator.geolocation) {
      setVolunteerError("Geolocation is not supported in this browser");
      return;
    }
    if (!window.isSecureContext) {
      setVolunteerError("Current location needs HTTPS or localhost. Open the app in a secure context and try again.");
      return;
    }

    setLocationDetectingLoading(true);
    setVolunteerError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setVolunteerForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocationDetectingLoading(false);
      },
      (geoError) => {
        setVolunteerError(getGeoErrorMessage(geoError));
        setLocationDetectingLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSkillToggle = (skill) => {
    setVolunteerForm((prev) => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const handleSubmitVolunteerProfile = async (e) => {
    e.preventDefault();
    setVolunteerError("");
    setVolunteerSuccess("");

    // Validation
    if (!volunteerForm.phone.trim()) {
      setVolunteerError("Phone number is required");
      return;
    }

    if (volunteerForm.skills.length === 0) {
      setVolunteerError("Select at least one skill");
      return;
    }

    const lat = toNumber(volunteerForm.latitude);
    const lon = toNumber(volunteerForm.longitude);

    if (lat === null || lon === null) {
      setVolunteerError("Please set your location using the map or current location button");
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setVolunteerError("Coordinates out of range: lon -180..180, lat -90..90");
      return;
    }

    if (!volunteerForm.emergencyContactName.trim()) {
      setVolunteerError("Emergency contact name is required");
      return;
    }

    if (!volunteerForm.emergencyContactPhone.trim()) {
      setVolunteerError("Emergency contact phone is required");
      return;
    }

    setSubmitVolunteerLoading(true);

    try {
      const payload = {
        phone: volunteerForm.phone.trim(),
        skills: volunteerForm.skills,
        location: {
          type: "Point",
          coordinates: [lon, lat],
        },
        preferredRadius: Math.max(1, Math.min(50, Number(volunteerForm.preferredRadius) || 5)),
        emergencyContact: {
          name: volunteerForm.emergencyContactName.trim(),
          phone: volunteerForm.emergencyContactPhone.trim(),
          relationship: volunteerForm.emergencyContactRelationship.trim() || "Not specified",
        },
      };

      const response = await api.post("/volunteers/profile", payload);
      const savedProfile = response.data.data?.profile;
      setVolunteerProfile(savedProfile);
      setVolunteerSuccess("Volunteer profile saved successfully! Ready to receive alerts.");
      setShowVolunteerForm(false);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.response?.data?.error || "Failed to save volunteer profile";
      setVolunteerError(message);
    } finally {
      setSubmitVolunteerLoading(false);
    }
  };

  const hasVolunteerCoordinates = Boolean(volunteerForm.latitude && volunteerForm.longitude);

  return (
    <section className="space-y-6">
      {loading ? <LoadingSpinner label="Loading profile..." /> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}
      {volunteerSuccess ? <FeedbackMessage tone="success">{volunteerSuccess}</FeedbackMessage> : null}

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

          {/* Volunteer Stats Section */}
          {role === "volunteer" && volunteerProfile ? (
            <Card className="space-y-4 border-green-100 bg-white">
              <SectionHeader
                title="Your Contribution Stats"
                subtitle="Track your volunteer performance and impact."
              />

              {statsLoading ? (
                <LoadingSpinner label="Loading stats..." />
              ) : volunteerStats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-transparent p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Alerts</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{volunteerStats.totalAlerts}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-green-50 to-transparent p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed</p>
                    <p className="mt-2 text-3xl font-bold text-green-600">{volunteerStats.completedAlerts}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-orange-50 to-transparent p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accepted</p>
                    <p className="mt-2 text-3xl font-bold text-orange-600">{volunteerStats.acceptedAlerts}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-red-50 to-transparent p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cancelled</p>
                    <p className="mt-2 text-3xl font-bold text-red-600">{volunteerStats.cancelledAlerts}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-purple-50 to-transparent p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Hours</p>
                    <p className="mt-2 text-3xl font-bold text-purple-600">{volunteerStats.totalHours.toFixed(1)}</p>
                  </div>
                </div>
              ) : null}

              {volunteerStats && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Completion Rate
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {volunteerStats.completionRate}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Avg Completion Time
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {volunteerStats.averageCompletionTime.toFixed(0)} min
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Status</p>
                    <p className="mt-2 flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full bg-green-500"></span>
                      <span className="font-bold text-slate-900">
                        {volunteerProfile.status?.toUpperCase() || "AVAILABLE"}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {volunteerProfile && (
                <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
                  <span className="text-sm font-medium text-slate-700">Quick Status Update:</span>
                  <button
                    type="button"
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      volunteerProfile.status === "available"
                        ? "bg-green-100 text-green-700"
                        : "border border-green-300 text-green-600 hover:bg-green-50"
                    }`}
                    onClick={() => handleStatusUpdate("available")}
                    disabled={statusUpdating}
                  >
                    Available
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      volunteerProfile.status === "busy"
                        ? "bg-orange-100 text-orange-700"
                        : "border border-orange-300 text-orange-600 hover:bg-orange-50"
                    }`}
                    onClick={() => handleStatusUpdate("busy")}
                    disabled={statusUpdating}
                  >
                    Busy
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      volunteerProfile.status === "offline"
                        ? "bg-slate-200 text-slate-700"
                        : "border border-slate-300 text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => handleStatusUpdate("offline")}
                    disabled={statusUpdating}
                  >
                    Offline
                  </button>
                </div>
              )}
            </Card>
          ) : null}

          {/* Volunteer Profile Section */}
          {role === "volunteer" ? (
            <Card className="space-y-4 border-blue-100 bg-white">
              <div className="flex items-center justify-between">
                <SectionHeader
                  title="Volunteer Profile"
                  subtitle="Complete your volunteer profile to start receiving nearby alerts and helping trees."
                />
                {!showVolunteerForm && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowVolunteerForm(!showVolunteerForm)}
                  >
                    {volunteerProfile ? "Edit Profile" : "Create Profile"}
                  </button>
                )}
              </div>

              {volunteerProfile && !showVolunteerForm ? (
                <div className="space-y-4">
                  {volunteerError ? <FeedbackMessage tone="error">{volunteerError}</FeedbackMessage> : null}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{volunteerProfile.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          <Badge variant={volunteerProfile.isAvailable ? "success" : "warning"}>
                            {volunteerProfile.status?.toUpperCase() || "AVAILABLE"}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</p>
                        <p className="mt-2 flex flex-wrap gap-2">
                          {volunteerProfile.skills?.length > 0 ? (
                            volunteerProfile.skills.map((skill) => (
                              <Badge key={skill} variant="info">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-slate-600">No skills added</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preferred Radius</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {volunteerProfile.preferredRadius} km
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {volunteerProfile.location?.coordinates
                            ? `Lat ${volunteerProfile.location.coordinates[1]?.toFixed(5)}, Lon ${volunteerProfile.location.coordinates[0]?.toFixed(5)}`
                            : "-"}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Emergency Contact
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {volunteerProfile.emergencyContact?.name} -{" "}
                          {volunteerProfile.emergencyContact?.phone}
                        </p>
                        <p className="text-xs text-slate-600">
                          ({volunteerProfile.emergencyContact?.relationship})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {showVolunteerForm ? (
                <form onSubmit={handleSubmitVolunteerProfile} noValidate className="space-y-4">
                  {volunteerError ? <FeedbackMessage tone="error">{volunteerError}</FeedbackMessage> : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="volunteer-phone">
                        Phone Number *
                      </label>
                      <input
                        id="volunteer-phone"
                        className="input"
                        type="tel"
                        placeholder="+94771234567"
                        value={volunteerForm.phone}
                        onChange={(e) =>
                          setVolunteerForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="volunteer-radius">
                        Preferred Radius (km) *
                      </label>
                      <input
                        id="volunteer-radius"
                        className="input"
                        type="number"
                        min="1"
                        max="50"
                        value={volunteerForm.preferredRadius}
                        onChange={(e) =>
                          setVolunteerForm((prev) => ({
                            ...prev,
                            preferredRadius: Math.max(1, Math.min(50, Number(e.target.value || 5))),
                          }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Skills *</label>
                    <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 md:grid-cols-3">
                      {availableSkills.map((skill) => (
                        <label key={skill} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-white">
                          <input
                            type="checkbox"
                            checked={volunteerForm.skills.includes(skill)}
                            onChange={() => handleSkillToggle(skill)}
                            className="h-4 w-4 rounded border-slate-300 text-leaf-600"
                          />
                          <span className="text-sm font-medium text-slate-700 capitalize">
                            {skill.replace(/_/g, " ")}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Location *</label>
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setShowMapPicker((prev) => !prev)}
                        >
                          {showMapPicker ? "Hide Map Picker" : "Select from Map"}
                        </button>
                        {hasVolunteerCoordinates ? (
                          <Badge variant="info">
                            Lat {volunteerForm.latitude}, Lon {volunteerForm.longitude}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">No location selected yet</Badge>
                        )}
                      </div>

                      {showMapPicker ? (
                        <CoordinatePickerMap
                          latitude={volunteerForm.latitude}
                          longitude={volunteerForm.longitude}
                          onSelect={handleMapCoordinateSelect}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="volunteer-lat">
                        Latitude *
                      </label>
                      <input
                        id="volunteer-lat"
                        className="input"
                        type="number"
                        step="0.000001"
                        placeholder="6.927100"
                        value={volunteerForm.latitude}
                        onChange={(e) =>
                          setVolunteerForm((prev) => ({ ...prev, latitude: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="volunteer-lon">
                        Longitude *
                      </label>
                      <input
                        id="volunteer-lon"
                        className="input"
                        type="number"
                        step="0.000001"
                        placeholder="79.861200"
                        value={volunteerForm.longitude}
                        onChange={(e) =>
                          setVolunteerForm((prev) => ({ ...prev, longitude: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn-secondary" onClick={handleCurrentLocationForVolunteer}>
                      {locationDetectingLoading ? "Detecting..." : "Use Current Location"}
                    </button>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-900">Emergency Contact *</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="label" htmlFor="emergency-name">
                          Name *
                        </label>
                        <input
                          id="emergency-name"
                          className="input"
                          placeholder="John Doe"
                          value={volunteerForm.emergencyContactName}
                          onChange={(e) =>
                            setVolunteerForm((prev) => ({
                              ...prev,
                              emergencyContactName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="emergency-phone">
                          Phone *
                        </label>
                        <input
                          id="emergency-phone"
                          className="input"
                          type="tel"
                          placeholder="+94777654321"
                          value={volunteerForm.emergencyContactPhone}
                          onChange={(e) =>
                            setVolunteerForm((prev) => ({
                              ...prev,
                              emergencyContactPhone: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="emergency-relationship">
                          Relationship
                        </label>
                        <input
                          id="emergency-relationship"
                          className="input"
                          placeholder="e.g. Friend, Family"
                          value={volunteerForm.emergencyContactRelationship}
                          onChange={(e) =>
                            setVolunteerForm((prev) => ({
                              ...prev,
                              emergencyContactRelationship: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-primary" disabled={submitVolunteerLoading}>
                      {submitVolunteerLoading ? "Saving..." : "Save Volunteer Profile"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowVolunteerForm(false)}
                      disabled={submitVolunteerLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </Card>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default ProfilePage;
