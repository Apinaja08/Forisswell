import { useEffect, useState } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import EmptyState from "../components/ui/EmptyState";

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
    <section className="space-y-6">
      <Card className="border-leaf-100 bg-white/90">
        <SectionHeader
          title="Community Events"
          subtitle="Browse workshops and intervention activities with filters and pagination."
          right={<Badge variant="info">Page {page}</Badge>}
        />
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <label className="label" htmlFor="city-filter">Filter by City</label>
            <input
              id="city-filter"
              className="input"
              placeholder="e.g. Colombo"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="chip">Page {page}</span>
            <button className="btn-secondary" onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </Card>

      {loading ? <LoadingSpinner label="Loading events..." /> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      {!loading && !error ? (
        events.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {events.map((event) => (
              <Card key={event._id} className="transition hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{event.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{event.description || "No description available."}</p>
                  </div>
                  <Badge variant="leaf">{event.status || "upcoming"}</Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-800">Type:</span> {event.eventType || "-"}</p>
                  <p><span className="font-semibold text-slate-800">City:</span> {event.location?.city || "-"}</p>
                  <p><span className="font-semibold text-slate-800">Start:</span> {event.startDate ? new Date(event.startDate).toLocaleString() : "-"}</p>
                  <p><span className="font-semibold text-slate-800">Capacity:</span> {event.currentParticipants || 0}/{event.maxParticipants || 0}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No events found"
            description="Try another city filter or move to the next page to discover upcoming activities."
            actionLabel="View Dashboard"
            actionTo="/dashboard"
          />
        )
      ) : null}
    </section>
  );
}

export default EventsPage;
