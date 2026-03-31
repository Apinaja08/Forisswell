import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = { lat: 6.9271, lon: 79.8612 };
const DEFAULT_ZOOM = 12;
const SELECTED_ZOOM = 15;
const SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function CoordinatePickerMap({ latitude, longitude, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const parsed = useMemo(() => {
    const lat = toNumber(latitude);
    const lon = toNumber(longitude);
    return {
      lat,
      lon,
      valid: lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180,
    };
  }, [latitude, longitude]);

  const upsertMarker = (lat, lon) => {
    const map = mapRef.current;
    if (!map) return;

    const latLng = [lat, lon];
    if (!markerRef.current) {
      markerRef.current = L.circleMarker(latLng, {
        radius: 8,
        color: "#166534",
        fillColor: "#22c55e",
        fillOpacity: 0.85,
        weight: 2,
      }).addTo(map);
      return;
    }

    markerRef.current.setLatLng(latLng);
  };

  const selectPoint = (lat, lon, nextZoom = SELECTED_ZOOM) => {
    const map = mapRef.current;
    if (map) {
      upsertMarker(lat, lon);
      map.setView([lat, lon], Math.max(map.getZoom(), nextZoom));
    }

    if (onSelectRef.current) {
      onSelectRef.current({ lat, lon });
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = parsed.valid ? [parsed.lat, parsed.lon] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lon];
    const map = L.map(containerRef.current, {
      center,
      zoom: parsed.valid ? SELECTED_ZOOM : DEFAULT_ZOOM,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (parsed.valid) {
      upsertMarker(parsed.lat, parsed.lon);
    }

    map.on("click", (event) => {
      const lat = event.latlng.lat;
      const lon = event.latlng.lng;
      selectPoint(lat, lon, SELECTED_ZOOM);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [parsed.lat, parsed.lon, parsed.valid]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !parsed.valid) return;
    upsertMarker(parsed.lat, parsed.lon);
    map.setView([parsed.lat, parsed.lon], Math.max(map.getZoom(), SELECTED_ZOOM));
  }, [parsed.lat, parsed.lon, parsed.valid]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const term = query.trim();

    if (!term) {
      setSearchError("Enter a place to search.");
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setSearchError("");

    try {
      const params = new URLSearchParams({
        q: term,
        format: "jsonv2",
        addressdetails: "1",
        limit: "5",
      });

      const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }

      const payload = await response.json();
      const normalized = Array.isArray(payload)
        ? payload
            .map((item) => {
              const lat = Number(item.lat);
              const lon = Number(item.lon);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              return {
                id: String(item.place_id || `${lat}-${lon}`),
                label: item.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
                lat,
                lon,
              };
            })
            .filter(Boolean)
        : [];

      if (normalized.length === 0) {
        setSearchResults([]);
        setSearchError("No locations found. Try a different search.");
        return;
      }

      setSearchResults(normalized);

      if (normalized.length === 1) {
        selectPoint(normalized[0].lat, normalized[0].lon, SELECTED_ZOOM);
      }
    } catch (error) {
      setSearchResults([]);
      setSearchError(error.message || "Failed to search location.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="space-y-3 border-b border-slate-200 px-3 py-3">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearch}>
          <input
            type="text"
            className="input"
            placeholder="Search place or address"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="btn-secondary sm:w-auto" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {searchError ? <p className="text-xs text-red-600">{searchError}</p> : null}

        {searchResults.length > 0 ? (
          <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                className="w-full rounded-lg bg-white px-2 py-2 text-left text-xs text-slate-700 transition hover:bg-leaf-50"
                onClick={() => selectPoint(result.lat, result.lon, SELECTED_ZOOM)}
              >
                {result.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="h-80 w-full" />
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Search above or click the map to set coordinates.
      </div>
    </div>
  );
}

export default CoordinatePickerMap;
