import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl, ScaleControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [6.9271, 79.8612];
const DEFAULT_ZOOM = 12;
const SELECTED_ZOOM = 15;
const SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";

// Fix for Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Map click handler component
function MapClickHandler({ onMapClick, allowClick }) {
  useMapEvents({
    click: (e) => {
      if (allowClick) {
        onMapClick(e);
      }
    },
  });
  return null;
}

// Zoom controls component
function MapZoomControls() {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control-zoom leaflet-bar leaflet-control">
        <button
          className="leaflet-control-zoom-in"
          onClick={() => map.zoomIn()}
          title="Zoom In"
        >
          +
        </button>
        <button
          className="leaflet-control-zoom-out"
          onClick={() => map.zoomOut()}
          title="Zoom Out"
        >
          −
        </button>
      </div>
    </div>
  );
}

// Geolocation component (must be inside MapContainer)
function GeolocationButton() {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const handleGeolocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], SELECTED_ZOOM, { duration: 1 });
          setLoading(false);
        },
        () => {
          console.error("Failed to get geolocation");
          setLoading(false);
        }
      );
    }
  };

  // Create a custom control using Leaflet's control system
  useEffect(() => {
    const geoControl = L.Control.extend({
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar');
        const button = L.DomUtil.create('button', '', container);
        button.innerHTML = '📍';
        button.style.width = '36px';
        button.style.height = '36px';
        button.style.padding = '6px';
        button.style.background = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.fontSize = '18px';
        button.style.cursor = 'pointer';
        button.title = 'Use current location';
        button.onclick = (e) => {
          L.DomEvent.stopPropagation(e);
          handleGeolocation();
        };
        return container;
      }
    });

    const control = new geoControl({ position: 'bottomright' });
    control.addTo(map);

    return () => {
      if (control) {
        map.removeControl(control);
      }
    };
  }, [map]);

  return null;
}

// Geolocation Button Wrapper (rendered outside MapContainer)
function GeolocationButtonWrapper() {
  return null; // Placeholder, will be handled via MapContainer's position system
}

function CoordinatePickerMap({ latitude, longitude, onSelect }) {
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [markerPosition, setMarkerPosition] = useState(null);
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

  useEffect(() => {
    if (parsed.valid) {
      setMapCenter([parsed.lat, parsed.lon]);
      setMarkerPosition([parsed.lat, parsed.lon]);
      setMapZoom(SELECTED_ZOOM);
    }
  }, [parsed.lat, parsed.lon, parsed.valid]);

  const selectPoint = (lat, lon, nextZoom = SELECTED_ZOOM) => {
    setMapCenter([lat, lon]);
    setMarkerPosition([lat, lon]);
    setMapZoom(Math.max(mapZoom, nextZoom));

    if (onSelectRef.current) {
      onSelectRef.current({ lat, lon });
    }
  };

  const handleMapClick = (event) => {
    const lat = event.latlng.lat;
    const lon = event.latlng.lng;
    selectPoint(lat, lon, SELECTED_ZOOM);
  };

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
        limit: "8",
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="space-y-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-4">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearch}>
          <input
            type="text"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm placeholder-slate-500 transition focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-50"
            placeholder="Search place or address..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="btn-secondary sm:w-auto" disabled={searching}>
            {searching ? (
              <>
                <span className="inline-block mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Searching...
              </>
            ) : (
              "Search"
            )}
          </button>
        </form>

        {searchError ? <p className="text-xs text-red-600 flex items-center gap-1">⚠️ {searchError}</p> : null}

        {searchResults.length > 0 ? (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                className="w-full rounded-lg bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-leaf-50 hover:text-leaf-700 border border-transparent hover:border-leaf-200"
                onClick={() => {
                  selectPoint(result.lat, result.lon, SELECTED_ZOOM);
                  setSearchResults([]);
                  setQuery("");
                }}
              >
                📍 {result.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative h-96 w-full bg-slate-100 sm:h-[500px]">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          zoomControl={false}
          scrollWheelZoom={true}
          touchZoom={true}
          dragging={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            maxZoom={19}
            minZoom={2}
          />
          <ScaleControl position="bottomleft" />
          <ZoomControl position="topright" />
          <MapClickHandler onMapClick={handleMapClick} allowClick={true} />
          <GeolocationButton />
          
          {markerPosition && (
            <Marker position={markerPosition}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-sm">Latitude: {markerPosition[0].toFixed(5)}</p>
                  <p className="font-semibold text-sm">Longitude: {markerPosition[1].toFixed(5)}</p>
                  <button
                    onClick={() => {
                      selectPoint(markerPosition[0], markerPosition[1]);
                    }}
                    className="mt-2 rounded bg-leaf-500 px-3 py-1 text-xs text-white hover:bg-leaf-600"
                  >
                    Confirm
                  </button>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 text-xs text-slate-600 space-y-1">
        <p><strong>💡 How to use:</strong> Search above or click on the map to set coordinates.</p>
        <p>📍 Click the location button to use your current location.</p>
      </div>
    </div>
  );
}

export default CoordinatePickerMap;
