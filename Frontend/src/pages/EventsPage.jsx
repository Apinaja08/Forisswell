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
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    limit: 6,
    page: 1
  });
  
  // Modal states
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventType: "workshop",
    startDate: "",
    endDate: "",
    location: {
      address: "",
      city: "",
      coordinates: { lat: "", lng: "" }
    },
    maxParticipants: 50,
    tags: [],
    status: "upcoming",
    reminders: true
  });
  
  const [tagInput, setTagInput] = useState("");
  
  // FIXED: Get user from localStorage with better error handling
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      console.log("User from localStorage:", userStr); // Debug log
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      // Check if user has id or _id
      if (user && (user.id || user._id)) {
        return {
          id: user.id || user._id,
          role: user.role,
          name: user.name,
          ...user
        };
      }
      return null;
    } catch (e) {
      console.error("Error parsing user:", e);
      return null;
    }
  };
  
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  const isLoggedIn = !!user;
  
  console.log("User state:", { user, isLoggedIn, isAdmin }); // Debug log

  const eventTypes = [
    { value: "", label: "All Types" },
    { value: "planting", label: "🌱 Planting" },
    { value: "workshop", label: "📚 Workshop" },
    { value: "community_garden", label: "🌻 Community Garden" },
    { value: "tree_planting", label: "🌳 Tree Planting" },
    { value: "educational", label: "🎓 Educational" }
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "upcoming", label: "Upcoming" },
    { value: "ongoing", label: "Ongoing" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" }
  ];

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

  useEffect(() => {
    fetchEvents();
  }, [page, city, eventType, status]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      eventType: "workshop",
      startDate: "",
      endDate: "",
      location: {
        address: "",
        city: "",
        coordinates: { lat: "", lng: "" }
      },
      maxParticipants: 50,
      tags: [],
      status: "upcoming",
      reminders: true
    });
    setTagInput("");
    setFormError("");
    setFormSuccess("");
  };

  // FIXED: Allow any logged-in user to create events (not just admin)
  const handleCreateEvent = () => {
    if (!isLoggedIn) {
      setError("Please login to create events");
      return;
    }
    resetForm();
    setEditingEvent(null);
    setShowFormModal(true);
  };

  const handleEditEvent = (event) => {
    if (!isLoggedIn) {
      setError("Please login to edit events");
      return;
    }
    const isCreator = event.createdBy?._id === user.id || event.createdBy === user.id;
    if (!isAdmin && !isCreator) {
      setError("You don't have permission to edit this event");
      return;
    }
    
    setFormData({
      title: event.title || "",
      description: event.description || "",
      eventType: event.eventType || "workshop",
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      location: {
        address: event.location?.address || "",
        city: event.location?.city || "",
        coordinates: {
          lat: event.location?.coordinates?.lat || "",
          lng: event.location?.coordinates?.lng || ""
        }
      },
      maxParticipants: event.maxParticipants || 50,
      tags: event.tags || [],
      status: event.status || "upcoming",
      reminders: event.reminders !== undefined ? event.reminders : true
    });
    setEditingEvent(event);
    setShowFormModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddTag = () => {
    if (tagInput && !formData.tags.includes(tagInput)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput]
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        throw new Error("End date must be after start date");
      }

      const url = editingEvent ? `/events/${editingEvent._id}` : "/events";
      const method = editingEvent ? "put" : "post";
      
      const response = await api[method](url, formData);
      
      if (response.data.success) {
        setFormSuccess(editingEvent ? "Event updated successfully!" : "Event created successfully!");
        setTimeout(() => {
          setShowFormModal(false);
          fetchEvents();
          resetForm();
        }, 1500);
      }
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || "Failed to save event");
    } finally {
      setFormLoading(false);
    }
  };

  const handleJoinEvent = async (eventId) => {
    if (!isLoggedIn) {
      setError("Please login to join events");
      return;
    }
    
    try {
      const response = await api.post(`/events/${eventId}/join`);
      if (response.data.success) {
        await fetchEvents();
        if (selectedEvent?._id === eventId) {
          await fetchEventDetails(eventId);
        }
        setError(""); // Clear any errors
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to join event");
    }
  };

  const handleLeaveEvent = async (eventId) => {
    if (!isLoggedIn) {
      setError("Please login to leave events");
      return;
    }
    
    try {
      const response = await api.post(`/events/${eventId}/leave`);
      if (response.data.success) {
        await fetchEvents();
        if (selectedEvent?._id === eventId) {
          await fetchEventDetails(eventId);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to leave event");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!isLoggedIn) {
      setError("Please login to delete events");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await api.delete(`/events/${eventId}`);
      if (response.data.success) {
        setShowDetailsModal(false);
        await fetchEvents();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete event");
    }
  };

  const fetchEventDetails = async (eventId) => {
    try {
      const response = await api.get(`/events/${eventId}`);
      if (response.data.success) {
        setSelectedEvent(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch event details", err);
    }
  };

  const openEventDetails = async (event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
    await fetchEventDetails(event._id);
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

  // FIXED: Check if user is joined in the event
  const isUserJoined = (event) => {
    if (!isLoggedIn || !event?.participants) return false;
    
    return event.participants.some(participant => {
      // Check different possible structures
      if (participant.user?._id) return participant.user._id === user.id;
      if (participant.user === user.id) return true;
      if (participant._id === user.id) return true;
      if (participant.user?.id) return participant.user.id === user.id;
      return false;
    });
  };

  // Get user's participation status
  const getUserParticipantStatus = (event) => {
    if (!isLoggedIn || !event?.participants) return null;
    
    const participant = event.participants.find(participant => {
      if (participant.user?._id) return participant.user._id === user.id;
      if (participant.user === user.id) return true;
      if (participant._id === user.id) return true;
      if (participant.user?.id) return participant.user.id === user.id;
      return false;
    });
    
    return participant?.status;
  };

  // Check if user can edit/delete event
  const canManageEvent = (event) => {
    if (!isLoggedIn) return false;
    if (isAdmin) return true;
    const isCreator = event.createdBy?._id === user.id || event.createdBy === user.id;
    return isCreator;
  };

  // FIXED: Check if user can view participants list - Admin or Creator
  const canViewParticipants = (event) => {
    if (!isLoggedIn) return false;
    if (isAdmin) return true;
    const isCreator = event.createdBy?._id === user.id || event.createdBy === user.id;
    return isCreator;
  };

  const handleResetFilters = () => {
    setCity("");
    setEventType("");
    setStatus("");
    setPage(1);
  };

  // Modal Component for Event Details
  const EventDetailsModal = () => {
    if (!selectedEvent) return null;
    
    const statusConfig = formatStatus(selectedEvent.status);
    const isJoined = isUserJoined(selectedEvent);
    const participantStatus = getUserParticipantStatus(selectedEvent);
    const isFull = selectedEvent.currentParticipants >= selectedEvent.maxParticipants;
    const canJoin = !isJoined && !isFull && selectedEvent.status === 'upcoming';
    const canManage = canManageEvent(selectedEvent);
    const canViewParts = canViewParticipants(selectedEvent);
    
    // Separate confirmed and waitlist participants
    const confirmedParticipants = selectedEvent.participants?.filter(p => p.status === 'confirmed') || [];
    const waitlistParticipants = selectedEvent.participants?.filter(p => p.status === 'waitlist') || [];

    console.log("Event details modal - canViewParts:", canViewParts, "isAdmin:", isAdmin, "selectedEvent:", selectedEvent); // Debug log

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="border-b pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedEvent.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    <Badge variant="secondary">{formatEventType(selectedEvent.eventType)}</Badge>
                    {isFull && <Badge variant="warning">Full</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {canManage && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          handleEditEvent(selectedEvent);
                        }}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(selectedEvent._id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 whitespace-pre-wrap">{selectedEvent.description}</p>
            </div>

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">📍 Location:</span>
                  <span className="text-slate-600">
                    {selectedEvent.location?.address ? `${selectedEvent.location.address}, ` : ""}
                    {selectedEvent.location?.city || "Virtual"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">📅 Start Date:</span>
                  <span className="text-slate-600">{formatDate(selectedEvent.startDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">⏰ End Date:</span>
                  <span className="text-slate-600">{formatDate(selectedEvent.endDate)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">👥 Participants:</span>
                  <span className="text-slate-600">
                    {selectedEvent.currentParticipants || 0} / {selectedEvent.maxParticipants || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">👤 Organizer:</span>
                  <span className="text-slate-600">{selectedEvent.createdBy?.name || "System"}</span>
                </div>
                {selectedEvent.tags?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">🏷️ Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedEvent.tags.map(tag => (
                        <Badge key={tag} variant="secondary" size="sm">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Participants List - Only visible to Admin or Event Creator */}
            {canViewParts && selectedEvent.participants?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Participants ({selectedEvent.participants.length})
                </h3>
                
                {/* Confirmed Participants */}
                {confirmedParticipants.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-slate-800 mb-2">Confirmed ({confirmedParticipants.length})</h4>
                    <div className="space-y-2">
                      {confirmedParticipants.map((participant, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-sm font-semibold">
                                {participant.user?.name?.charAt(0) || "U"}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {participant.user?.name || "Anonymous"}
                              </p>
                              <p className="text-xs text-slate-500">
                                Joined: {new Date(participant.joinedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="success" size="sm">Confirmed</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Waitlist Participants */}
                {waitlistParticipants.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Waitlist ({waitlistParticipants.length})</h4>
                    <div className="space-y-2">
                      {waitlistParticipants.map((participant, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                              <span className="text-yellow-600 text-sm font-semibold">
                                {participant.user?.name?.charAt(0) || "U"}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {participant.user?.name || "Anonymous"}
                              </p>
                              <p className="text-xs text-slate-500">
                                Joined: {new Date(participant.joinedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="warning" size="sm">Waitlist</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message when user can't view participants */}
            {!canViewParts && selectedEvent.participants?.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  Participant list is only visible to event organizers and admins.
                </p>
              </div>
            )}

            {/* Action Buttons - FIXED: Properly check login state */}
            {isLoggedIn ? (
              <div className="flex gap-3 pt-4 border-t">
                {!isJoined && canJoin && (
                  <button
                    onClick={() => handleJoinEvent(selectedEvent._id)}
                    className="btn-primary flex-1"
                  >
                    Join Event
                  </button>
                )}
                {isJoined && participantStatus === 'confirmed' && (
                  <button
                    onClick={() => handleLeaveEvent(selectedEvent._id)}
                    className="btn-secondary flex-1"
                  >
                    Leave Event
                  </button>
                )}
                {isJoined && participantStatus === 'waitlist' && (
                  <div className="flex-1 text-center">
                    <Badge variant="warning" className="w-full">
                      On Waitlist - {selectedEvent.currentParticipants}/{selectedEvent.maxParticipants} spots filled
                    </Badge>
                    <button
                      onClick={() => handleLeaveEvent(selectedEvent._id)}
                      className="btn-secondary w-full mt-2"
                    >
                      Cancel Waitlist
                    </button>
                  </div>
                )}
                {!isJoined && !canJoin && !isFull && selectedEvent.status !== 'upcoming' && (
                  <div className="flex-1 text-center">
                    <Badge variant="secondary" className="w-full">
                      This event is {selectedEvent.status}
                    </Badge>
                  </div>
                )}
                {!isJoined && isFull && (
                  <div className="flex-1 text-center">
                    <Badge variant="warning" className="w-full">
                      Event is Full - Join Waitlist
                    </Badge>
                    <button
                      onClick={() => handleJoinEvent(selectedEvent._id)}
                      className="btn-secondary w-full mt-2"
                    >
                      Join Waitlist
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-4 border-t">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-800 mb-2">
                    Please login to join this event and participate in community activities.
                  </p>
                  <button 
                    className="btn-primary"
                    onClick={() => window.location.href = '/login'}
                  >
                    Login to Join
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Modal Component for Event Form (Create/Edit)
  const EventFormModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingEvent ? "Edit Event" : "Create New Event"}
              </h2>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {formError && (
              <FeedbackMessage tone="error" onDismiss={() => setFormError("")}>
                {formError}
              </FeedbackMessage>
            )}

            {formSuccess && (
              <FeedbackMessage tone="success" onDismiss={() => setFormSuccess("")}>
                {formSuccess}
              </FeedbackMessage>
            )}

            <form onSubmit={handleSubmitEvent} className="space-y-4">
              {/* Title */}
              <div>
                <label className="label" htmlFor="title">Event Title *</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  className="input"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Enter event title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="label" htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows="4"
                  className="input"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Describe the event details..."
                />
              </div>

              {/* Event Type and Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="eventType">Event Type *</label>
                  <select
                    id="eventType"
                    name="eventType"
                    required
                    className="input"
                    value={formData.eventType}
                    onChange={handleFormChange}
                  >
                    {eventTypes.filter(t => t.value).map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    className="input"
                    value={formData.status}
                    onChange={handleFormChange}
                  >
                    {statusOptions.filter(s => s.value).map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="startDate">Start Date & Time *</label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="datetime-local"
                    required
                    className="input"
                    value={formData.startDate}
                    onChange={handleFormChange}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="endDate">End Date & Time *</label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="datetime-local"
                    required
                    className="input"
                    value={formData.endDate}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Location</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="location.address">Address</label>
                    <input
                      id="location.address"
                      name="location.address"
                      type="text"
                      className="input"
                      value={formData.location.address}
                      onChange={handleFormChange}
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="location.city">City *</label>
                    <input
                      id="location.city"
                      name="location.city"
                      type="text"
                      className="input"
                      value={formData.location.city}
                      onChange={handleFormChange}
                      placeholder="City"
                    />
                  </div>
                </div>
              </div>

              {/* Capacity */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="maxParticipants">Maximum Participants</label>
                  <input
                    id="maxParticipants"
                    name="maxParticipants"
                    type="number"
                    min="1"
                    className="input"
                    value={formData.maxParticipants}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.reminders}
                      onChange={(e) => setFormData(prev => ({ ...prev, reminders: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Send email reminders</span>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="label" htmlFor="tags">Tags</label>
                <div className="flex gap-2">
                  <input
                    id="tags"
                    type="text"
                    className="input flex-1"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="e.g., outdoor, family-friendly"
                  />
                  <button type="button" onClick={handleAddTag} className="btn-secondary">
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-sm">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-slate-500 hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={formLoading}>
                  {formLoading ? "Saving..." : (editingEvent ? "Update Event" : "Create Event")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <Card className="border-leaf-100 bg-white/90">
        <SectionHeader
          title="Community Events"
          subtitle="Browse workshops, planting activities, and community gatherings"
          right={
            <div className="flex gap-2">
              {isLoggedIn && (
                <button
                  onClick={handleCreateEvent}
                  className="btn-primary text-sm"
                >
                  + Create Event
                </button>
              )}
              <Badge variant="info">Page {pagination.page} of {pagination.pages}</Badge>
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

      {/* Events Grid */}
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
            const isFull = event.currentParticipants >= event.maxParticipants;
            const userJoined = isUserJoined(event);
            
            return (
              <Card 
                key={event._id} 
                className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-card"
                onClick={() => openEventDetails(event)}
              >
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
                        {userJoined && (
                          <Badge variant="success" size="sm">
                            Joined
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {event.description}
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

                  <div className="text-xs text-leaf-600 hover:text-leaf-700">
                    Click to view details →
                  </div>
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

      {/* Modals */}
      {showDetailsModal && <EventDetailsModal />}
      {showFormModal && <EventFormModal />}
    </section>
  );
}

export default EventsPage;