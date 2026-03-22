import { useEffect, useState } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../hooks/useAuth";

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [city, setCity] = useState("");
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    limit: 6,
    page: 1
  });
  
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Event type options from schema
  const eventTypes = [
    { value: "", label: "All Types" },
    { value: "planting", label: "Planting" },
    { value: "workshop", label: "Workshop" },
    { value: "community_garden", label: "Community Garden" },
    { value: "tree_planting", label: "Tree Planting" },
    { value: "educational", label: "Educational" }
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "upcoming", label: "Upcoming" },
    { value: "ongoing", label: "Ongoing" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" }
  ];

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {
          page,
          limit: 6,
          ...(city && { city }),
          ...(eventType && { eventType }),
          ...(status && { status })
        };

        const response = await api.get("/events", { params });
        
        if (response.data.success) {
          setEvents(response.data.data || []);
          if (response.data.pagination) {
            setPagination(response.data.pagination);
          }
        } else {
          setEvents(response.data.data || []);
        }
      } catch (err) {
        setError(
          err.response?.data?.error || 
          err.response?.data?.message || 
          "Failed to load events"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page, city, eventType, status]);

  // Fixed: Better detection of user participation
  const isUserJoined = (event) => {
    if (!user || !event || !event.participants) return false;
    
    // Handle different possible structures of participants array
    return event.participants.some(participant => {
      // Case 1: participant is an object with user property (populated)
      if (participant.user && typeof participant.user === 'object') {
        return participant.user._id === user.id || participant.user._id === user._id;
      }
      // Case 2: participant.user is just the user ID string
      if (participant.user && typeof participant.user === 'string') {
        return participant.user === user.id || participant.user === user._id;
      }
      // Case 3: participant is directly the user ID (if not populated)
      if (typeof participant === 'string') {
        return participant === user.id || participant === user._id;
      }
      // Case 4: participant is an object with _id property
      if (participant._id) {
        return participant._id === user.id || participant._id === user._id;
      }
      return false;
    });
  };

  // Fixed: Get participant status with better detection
  const getParticipantStatus = (event) => {
    if (!user || !event || !event.participants) return null;
    
    const participant = event.participants.find(participant => {
      if (participant.user && typeof participant.user === 'object') {
        return participant.user._id === user.id || participant.user._id === user._id;
      }
      if (participant.user && typeof participant.user === 'string') {
        return participant.user === user.id || participant.user === user._id;
      }
      if (typeof participant === 'string') {
        return participant === user.id || participant === user._id;
      }
      if (participant._id) {
        return participant._id === user.id || participant._id === user._id;
      }
      return false;
    });
    
    return participant?.status || null;
  };

  const formatEventType = (type) => {
    const types = {
      planting: "🌱 Planting",
      workshop: "📚 Workshop",
      community_garden: "🌻 Community Garden",
      tree_planting: "🌳 Tree Planting",
      educational: "🎓 Educational"
    };
    return types[type] || type;
  };

  const formatStatus = (status) => {
    const statusConfig = {
      upcoming: { label: "Upcoming", variant: "info" },
      ongoing: { label: "Ongoing", variant: "success" },
      completed: { label: "Completed", variant: "secondary" },
      cancelled: { label: "Cancelled", variant: "error" }
    };
    return statusConfig[status] || { label: status, variant: "default" };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleJoinEvent = async (eventId) => {
    if (!user) {
      setError("Please login to join events");
      return;
    }
    
    try {
      const response = await api.post(`/events/${eventId}/join`);
      if (response.data.success) {
        // Refresh events to update participant count
        const fetchEvents = async () => {
          const params = {
            page,
            limit: 6,
            ...(city && { city }),
            ...(eventType && { eventType }),
            ...(status && { status })
          };
          const response = await api.get("/events", { params });
          if (response.data.success) {
            setEvents(response.data.data || []);
          }
        };
        fetchEvents();
        
        // Show success message
        setError(""); // Clear any existing errors
        alert(response.data.message || "Successfully joined event!");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to join event");
    }
  };

  const handleLeaveEvent = async (eventId) => {
    try {
      const response = await api.post(`/events/${eventId}/leave`);
      if (response.data.success) {
        // Refresh events
        const fetchEvents = async () => {
          const params = {
            page,
            limit: 6,
            ...(city && { city }),
            ...(eventType && { eventType }),
            ...(status && { status })
          };
          const response = await api.get("/events", { params });
          if (response.data.success) {
            setEvents(response.data.data || []);
          }
        };
        fetchEvents();
        
        alert(response.data.message || "Successfully left event");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to leave event");
    }
  };

  const handleResetFilters = () => {
    setCity("");
    setEventType("");
    setStatus("");
    setPage(1);
  };

  // Debug function to log event data structure (remove in production)
  const debugEventStructure = (event) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Event:', event._id);
      console.log('Participants structure:', event.participants);
      console.log('Current user ID:', user?.id || user?._id);
    }
  };

  return (
    <section className="space-y-6">
      <Card className="border-leaf-100 bg-white/90">
        <SectionHeader
          title="Community Events"
          subtitle="Browse workshops, planting activities, and community gatherings"
          right={
            <div className="flex gap-2">
              <Badge variant="info">Page {pagination.page} of {pagination.pages}</Badge>
              {isAdmin && (
                <Badge variant="success">Admin</Badge>
              )}
            </div>
          }
        />
      </Card>

      {/* Filters Section */}
      <Card>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
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

            <div>
              <label className="label" htmlFor="event-type-filter">Event Type</label>
              <select
                id="event-type-filter"
                className="input"
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value);
                  setPage(1);
                }}
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                className="input"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                className="btn-secondary w-full"
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-slate-600">
              Showing {events.length} of {pagination.total} events
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="chip">
                Page {pagination.page} of {pagination.pages || 1}
              </span>
              <button
                className="btn-secondary"
                onClick={() => setPage((p) => Math.min(pagination.pages || p, p + 1))}
                disabled={page === pagination.pages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content Section */}
      {loading && <LoadingSpinner label="Loading events..." />}
      
      {error && (
        <FeedbackMessage tone="error" onDismiss={() => setError("")}>
          {error}
        </FeedbackMessage>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => {
            const statusConfig = formatStatus(event.status);
            const joined = isUserJoined(event);
            const participantStatus = getParticipantStatus(event);
            const isFull = event.currentParticipants >= event.maxParticipants;
            const canJoin = !joined && !isFull && event.status === 'upcoming';
            
            // Debug participant info (remove in production)
            if (process.env.NODE_ENV === 'development') {
              debugEventStructure(event);
            }
            
            return (
              <Card key={event._id} className="transition hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-slate-900">{event.title}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="secondary">
                          {formatEventType(event.eventType)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600">
                    {event.description?.substring(0, 150)}
                    {event.description?.length > 150 && "..."}
                  </p>
                  
                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">📍 Location:</span>
                      <span>{event.location?.city || "Virtual"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">📅 Date:</span>
                      <span>{formatDate(event.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">👥 Capacity:</span>
                      <span>
                        {event.currentParticipants || 0}/{event.maxParticipants || 0}
                        {isFull && <span className="ml-1 text-orange-600">(Full)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">👤 Organizer:</span>
                      <span>{event.createdBy?.name || "System"}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {user && (
                    <div className="flex gap-2 pt-2">
                      {!joined && canJoin && (
                        <button
                          className="btn-primary flex-1"
                          onClick={() => handleJoinEvent(event._id)}
                        >
                          Join Event
                        </button>
                      )}
                      {joined && participantStatus === 'confirmed' && (
                        <button
                          className="btn-secondary flex-1"
                          onClick={() => handleLeaveEvent(event._id)}
                        >
                          Leave Event
                        </button>
                      )}
                      {joined && participantStatus === 'waitlist' && (
                        <div className="flex-1">
                          <Badge variant="warning" className="w-full text-center block">
                            On Waitlist
                          </Badge>
                        </div>
                      )}
                      {joined && !participantStatus && (
                        <div className="flex-1">
                          <Badge variant="info" className="w-full text-center block">
                            Joined
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!user && (
                    <button
                      className="btn-secondary w-full"
                      onClick={() => {/* Redirect to login */}}
                    >
                      Login to Join Events
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <EmptyState
          title="No events found"
          description={
            city || eventType || status
              ? "Try adjusting your filters to see more events."
              : "No events are currently scheduled. Check back later for community activities!"
          }
          actionLabel={city || eventType || status ? "Clear Filters" : "View Dashboard"}
          actionTo={city || eventType || status ? undefined : "/dashboard"}
          onAction={city || eventType || status ? handleResetFilters : undefined}
        />
      )}
    </section>
  );
}

export default EventsPage;