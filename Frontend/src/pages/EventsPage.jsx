import { useEffect, useState } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [city, setCity] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/events", {
          params: {
            page,
            limit: 6,
            ...(city ? { city } : {}),
          },
        });

        setEvents(response.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || err.response?.data?.error || "Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page, city]);

  return (
    <section className="space-y-4">
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Events</h1>
          <p className="text-sm text-slate-600">Connected to `GET /api/events` with pagination.</p>
        </div>
        <input
          className="input sm:w-64"
          placeholder="Filter by city"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="flex gap-2">
        <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous
        </button>
        <span className="self-center text-sm text-slate-600">Page {page}</span>
        <button className="btn-secondary" onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>

      {loading ? <LoadingSpinner label="Loading events..." /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <article key={event._id} className="card">
              <h2 className="font-semibold">{event.title}</h2>
              <p className="text-sm text-slate-600">Type: {event.eventType}</p>
              <p className="text-sm text-slate-600">City: {event.location?.city || "-"}</p>
              <p className="text-sm text-slate-600">Status: {event.status}</p>
            </article>
          ))}
          {events.length === 0 ? <p className="text-slate-500">No events found.</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export default EventsPage;
