import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import EmptyState from "../components/ui/EmptyState";

const statusTone = {
  PLANTED: "info",
  GROWING: "leaf",
  MATURE: "success",
  DEAD: "danger",
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatCoords = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return "-";
  const lon = toNumber(coords[0]);
  const lat = toNumber(coords[1]);
  if (lon === null || lat === null) return "-";
  return `Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)}`;
};

const distanceKm = (from, toCoords) => {
  if (!from || !Array.isArray(toCoords) || toCoords.length !== 2) return null;

  const lon2 = toNumber(toCoords[0]);
  const lat2 = toNumber(toCoords[1]);
  if (lon2 === null || lat2 === null) return null;

  const rad = Math.PI / 180;
  const dLat = (lat2 - from.lat) * rad;
  const dLon = (lon2 - from.lon) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const emptyCreateForm = {
  name: "",
  species: "",
  plantedDate: "",
  status: "PLANTED",
  longitude: "",
  latitude: "",
  notes: "",
  imageUrl: "",
};

function TreesPage() {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [status, setStatus] = useState("");
  const [species, setSpecies] = useState("");
  const [scope, setScope] = useState("all");
  const [radiusKm, setRadiusKm] = useState(5);

  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [form, setForm] = useState(emptyCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchTrees = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {};
        if (status) params.status = status;
        if (species) params.species = species;

        let endpoint = "/trees/all";

        if (scope === "my") {
          endpoint = "/trees";
        } else if (scope === "nearby") {
          if (!userLocation) {
            setTrees([]);
            setLoading(false);
            return;
          }
          endpoint = "/trees/nearby";
          params.lon = userLocation.lon;
          params.lat = userLocation.lat;
          params.radiusKm = radiusKm;
        }

        const response = await api.get(endpoint, { params });
        const list = response.data?.data?.trees;
        setTrees(Array.isArray(list) ? list : []);
      } catch (err) {
        const statusCode = err?.response?.status;
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (statusCode ? `Failed to load trees (HTTP ${statusCode})` : "Failed to load trees");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrees();
  }, [status, species, scope, userLocation, radiusKm, refreshKey]);

  const speciesList = useMemo(
    () => Array.from(new Set(trees.map((tree) => tree.species).filter(Boolean))),
    [trees]
  );

  const treesWithDistance = useMemo(
    () =>
      trees.map((tree) => ({
        ...tree,
        _distanceKm: distanceKm(userLocation, tree?.location?.coordinates),
      })),
    [trees, userLocation]
  );

  const detectUserLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser");
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setUserLocation(next);
        setScope("nearby");
        setLocationLoading(false);
      },
      (geoError) => {
        setError(geoError?.message || "Unable to get your location");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const setCreateFromCurrentLocation = () => {
    if (!navigator.geolocation) {
      setCreateError("Geolocation is not supported in this browser");
      return;
    }

    setLocationLoading(true);
    setCreateError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocationLoading(false);
      },
      (geoError) => {
        setCreateError(geoError?.message || "Unable to get current location");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateTree = async (e) => {
    e.preventDefault();
    setCreateError("");
    setSuccess("");

    const lon = toNumber(form.longitude);
    const lat = toNumber(form.latitude);

    if (lon === null || lat === null) {
      setCreateError("Please provide valid longitude and latitude values");
      return;
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      setCreateError("Coordinates out of range: lon -180..180, lat -90..90");
      return;
    }
    if (!form.species.trim()) {
      setCreateError("Species is required");
      return;
    }
    if (!form.plantedDate) {
      setCreateError("Planted date is required");
      return;
    }

    setCreateLoading(true);

    try {
      const payload = {
        name: form.name.trim() || undefined,
        species: form.species.trim(),
        plantedDate: form.plantedDate,
        status: form.status,
        imageUrl: form.imageUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
        location: {
          type: "Point",
          coordinates: [lon, lat],
        },
      };

      const response = await api.post("/trees", payload);
      const created = response.data?.data?.tree;
      const addressText = created?.location?.address?.formatted || formatCoords(created?.location?.coordinates);

      setSuccess(`Tree saved successfully. Location: ${addressText}`);
      setForm((prev) => ({
        ...emptyCreateForm,
        status: prev.status,
      }));
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to create tree record";
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <Card className="border-leaf-100 bg-white/90">
        <SectionHeader
          title="Tree Inventory"
          subtitle="Create coordinate-based tree records and explore nearby planted trees."
          right={
            <div className="flex items-center gap-2">
              <Badge variant={scope === "nearby" ? "warning" : scope === "my" ? "leaf" : "info"}>
                {scope === "nearby" ? "Nearby" : scope === "my" ? "My Trees" : "All Trees"}
              </Badge>
              <Badge variant="leaf">{trees.length} Records</Badge>
            </div>
          }
        />
      </Card>

      {success ? <FeedbackMessage tone="success">{success}</FeedbackMessage> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Add Tree Record</h2>
        <p className="mt-1 text-sm text-slate-600">
          Save a tree using precise coordinates. The backend will attach human-readable location data from Nominatim.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleCreateTree}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="tree-name">Tree Name (optional)</label>
              <input
                id="tree-name"
                className="input"
                placeholder="e.g. Kandy Mango Tree"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="tree-species">Species *</label>
              <input
                id="tree-species"
                className="input"
                placeholder="e.g. Mango"
                value={form.species}
                onChange={(e) => setForm((prev) => ({ ...prev, species: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label" htmlFor="tree-planted-date">Planted Date *</label>
              <input
                id="tree-planted-date"
                className="input"
                type="date"
                value={form.plantedDate}
                onChange={(e) => setForm((prev) => ({ ...prev, plantedDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="tree-status">Status</label>
              <select
                id="tree-status"
                className="input"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="PLANTED">PLANTED</option>
                <option value="GROWING">GROWING</option>
                <option value="MATURE">MATURE</option>
                <option value="DEAD">DEAD</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tree-image-url">Image URL (optional)</label>
              <input
                id="tree-image-url"
                className="input"
                type="url"
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="tree-longitude">Longitude *</label>
              <input
                id="tree-longitude"
                className="input"
                type="number"
                step="0.000001"
                placeholder="79.861200"
                value={form.longitude}
                onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="tree-latitude">Latitude *</label>
              <input
                id="tree-latitude"
                className="input"
                type="number"
                step="0.000001"
                placeholder="6.927100"
                value={form.latitude}
                onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="tree-notes">Notes (optional)</label>
            <textarea
              id="tree-notes"
              className="input min-h-24"
              placeholder="Add care or condition notes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {createError ? <FeedbackMessage tone="error">{createError}</FeedbackMessage> : null}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={setCreateFromCurrentLocation}>
              {locationLoading ? "Detecting..." : "Use Current Location"}
            </button>
            <button type="submit" className="btn-primary" disabled={createLoading}>
              {createLoading ? "Saving..." : "Save Tree"}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Data Scope</label>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
              {[
                { key: "all", label: "All" },
                { key: "my", label: "My" },
                { key: "nearby", label: "Nearby" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    scope === item.key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                  onClick={() => setScope(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="status-filter" className="label">Filter by Status</label>
            <select
              id="status-filter"
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="PLANTED">PLANTED</option>
              <option value="GROWING">GROWING</option>
              <option value="MATURE">MATURE</option>
              <option value="DEAD">DEAD</option>
            </select>
          </div>

          <div>
            <label htmlFor="species-filter" className="label">Filter by Species</label>
            <select
              id="species-filter"
              className="input"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            >
              <option value="">All Species</option>
              {speciesList.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="radius-km" className="label">Nearby Radius (km)</label>
            <input
              id="radius-km"
              className="input"
              type="number"
              min="1"
              max="50"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Math.max(1, Math.min(50, Number(e.target.value || 1))))}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={detectUserLocation}>
            {locationLoading ? "Detecting..." : "Detect My Location"}
          </button>
          {userLocation ? (
            <Badge variant="info">Lat {userLocation.lat.toFixed(5)}, Lon {userLocation.lon.toFixed(5)}</Badge>
          ) : (
            <Badge variant="neutral">Location not set</Badge>
          )}
        </div>
      </Card>

      {loading ? <LoadingSpinner label="Loading trees..." /> : null}

      {!loading && !error ? (
        treesWithDistance.length > 0 ? (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table-base">
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">Tree</th>
                    <th className="table-cell">Species</th>
                    <th className="table-cell">Status</th>
                    <th className="table-cell">Owner</th>
                    <th className="table-cell">Location</th>
                    <th className="table-cell">Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {treesWithDistance.map((tree) => (
                    <tr key={tree._id} className="table-row">
                      <td className="table-cell font-semibold text-slate-900">{tree.name || "Unnamed Tree"}</td>
                      <td className="table-cell">{tree.species}</td>
                      <td className="table-cell">
                        <Badge variant={statusTone[tree.status] || "neutral"}>{tree.status}</Badge>
                      </td>
                      <td className="table-cell">{tree.owner?.fullName || "-"}</td>
                      <td className="table-cell max-w-xs truncate" title={tree?.location?.address?.formatted || formatCoords(tree?.location?.coordinates)}>
                        {tree?.location?.address?.formatted || formatCoords(tree?.location?.coordinates)}
                      </td>
                      <td className="table-cell">
                        {tree._distanceKm !== null ? `${tree._distanceKm.toFixed(2)} km` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:hidden">
              {treesWithDistance.map((tree) => (
                <Card key={tree._id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{tree.name || "Unnamed Tree"}</h3>
                      <p className="mt-1 text-sm text-slate-600">{tree.species}</p>
                    </div>
                    <Badge variant={statusTone[tree.status] || "neutral"}>{tree.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Owner: {tree.owner?.fullName || "-"}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Location: {tree?.location?.address?.formatted || formatCoords(tree?.location?.coordinates)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Distance: {tree._distanceKm !== null ? `${tree._distanceKm.toFixed(2)} km` : "-"}
                  </p>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No trees found"
            description={
              scope === "nearby" && !userLocation
                ? "Set your current location and switch to Nearby to see planted trees around you."
                : "Adjust filters or add a new tree record with coordinates."
            }
            actionLabel="Go to Dashboard"
            actionTo="/dashboard"
          />
        )
      ) : null}
    </section>
  );
}

export default TreesPage;
