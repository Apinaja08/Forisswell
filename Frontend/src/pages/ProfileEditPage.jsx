import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Card from "../components/ui/Card";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import CoordinatePickerMap from "../components/ui/CoordinatePickerMap";
import SectionHeader from "../components/ui/SectionHeader";
import Badge from "../components/ui/Badge";

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

function ProfileEditPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [volunteerForm, setVolunteerForm] = useState(emptyVolunteerForm);
  const [volunteerError, setVolunteerError] = useState("");
  const [volunteerSuccess, setVolunteerSuccess] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationDetectingLoading, setLocationDetectingLoading] = useState(false);

  // Fetch existing volunteer profile
  useEffect(() => {
    const fetchVolunteerProfile = async () => {
      if (user?.role !== "volunteer") {
        navigate("/profile");
        return;
      }

      setLoading(true);
      try {
        const response = await api.get("/volunteers/profile");
        const profile = response.data.data?.profile;
        if (profile) {
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
        console.log("No volunteer profile found, user can create one");
      } finally {
        setLoading(false);
      }
    };

    fetchVolunteerProfile();
  }, [user?.role, navigate]);

  const handleMapCoordinateSelect = ({ lat, lon }) => {
    setVolunteerForm((prev) => ({
      ...prev,
      latitude: lat.toFixed ? lat.toFixed(6) : lat,
      longitude: lon.toFixed ? lon.toFixed(6) : lon,
    }));
    setShowMapPicker(false);
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

    setSubmitLoading(true);

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
      setVolunteerSuccess("Volunteer profile saved successfully! Ready to receive alerts.");
      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || "Failed to save volunteer profile";
      setVolunteerError(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const hasVolunteerCoordinates = Boolean(volunteerForm.latitude && volunteerForm.longitude);

  if (loading) {
    return <LoadingSpinner label="Loading profile..." />;
  }

  return (
    <section className="space-y-6">
      <Card className="border-blue-100 bg-white">
        <SectionHeader
          title="Edit Volunteer Profile"
          subtitle="Update your volunteer profile details, skills, and location."
        />
      </Card>

      <Card className="space-y-4">
        {volunteerError ? <FeedbackMessage tone="error">{volunteerError}</FeedbackMessage> : null}
        {volunteerSuccess ? <FeedbackMessage tone="success">{volunteerSuccess}</FeedbackMessage> : null}

        <form onSubmit={handleSubmitVolunteerProfile} noValidate className="space-y-4">
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
                onChange={(e) => setVolunteerForm((prev) => ({ ...prev, phone: e.target.value }))}
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
                  <span className="text-sm font-medium text-slate-700 capitalize">{skill.replace(/_/g, " ")}</span>
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
                onChange={(e) => setVolunteerForm((prev) => ({ ...prev, latitude: e.target.value }))}
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
                onChange={(e) => setVolunteerForm((prev) => ({ ...prev, longitude: e.target.value }))}
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

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button type="submit" className="btn-primary" disabled={submitLoading}>
              {submitLoading ? "Saving..." : "Save Volunteer Profile"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/profile")}
              disabled={submitLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </section>
  );
}

export default ProfileEditPage;
